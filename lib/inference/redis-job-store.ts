import type { Redis } from '@upstash/redis'
import type { InferenceJobStore } from '@/lib/inference/job-store'
import {
  INFERENCE_JOB_TTL_SECONDS,
  INFERENCE_WORKER_LEASE_MS,
  MAX_INFERENCE_ATTEMPTS,
  type ClaimedInferenceJob,
  type InferenceEvent,
  type InferenceJob,
  type InferenceJobPayload,
  type InferenceJobStatus,
  type PublishableInferenceEvent,
} from '@/lib/inference/types'

const QUEUE_KEY = 'vent-ai:inference:queue'
const CONSUMER_GROUP = 'vent-ai:inference:workers'
const MAX_EVENT_ENTRIES = 2000
const RECOVERY_SCAN_INTERVAL_MS = 5000

const ENQUEUE_SCRIPT = `
local existing = redis.call('GET', KEYS[1])
if existing then
  return {existing, '0'}
end
redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[5])
redis.call('HSET', KEYS[2],
  'id', ARGV[1],
  'requestId', ARGV[2],
  'status', 'queued',
  'payload', ARGV[3],
  'attempt', '0',
  'createdAt', ARGV[4],
  'updatedAt', ARGV[4])
redis.call('EXPIRE', KEYS[2], ARGV[5])
redis.call('XADD', KEYS[3], '*', 'jobId', ARGV[1], 'requestId', ARGV[2])
return {ARGV[1], '1'}
`

const MARK_RUNNING_SCRIPT = `
if redis.call('HGET', KEYS[1], 'status') ~= 'queued' then return 0 end
local attempt = redis.call('HINCRBY', KEYS[1], 'attempt', 1)
redis.call('HSET', KEYS[1], 'status', 'running', 'updatedAt', ARGV[1])
redis.call('EXPIRE', KEYS[1], ARGV[2])
return attempt
`

const REQUEUE_STALE_SCRIPT = `
if redis.call('HGET', KEYS[1], 'status') ~= 'running' then return 0 end
redis.call('HSET', KEYS[1], 'status', 'queued', 'updatedAt', ARGV[1])
redis.call('EXPIRE', KEYS[1], ARGV[2])
return 1
`

const TERMINAL_EVENT_SCRIPT = `
local current = redis.call('HGET', KEYS[1], 'status')
if current ~= ARGV[1] then return 0 end
redis.call('HSET', KEYS[1], 'status', ARGV[2], 'updatedAt', ARGV[3], 'error', ARGV[4])
redis.call('EXPIRE', KEYS[1], ARGV[5])
redis.call('XADD', KEYS[2], 'MAXLEN', '~', ARGV[6], '*', 'type', ARGV[7], 'data', ARGV[8])
redis.call('EXPIRE', KEYS[2], ARGV[5])
return 1
`

const CANCEL_SCRIPT = `
local current = redis.call('HGET', KEYS[1], 'status')
if current ~= 'queued' and current ~= 'running' then return 0 end
redis.call('HSET', KEYS[1], 'status', 'cancelled', 'updatedAt', ARGV[1])
redis.call('EXPIRE', KEYS[1], ARGV[2])
redis.call('XADD', KEYS[2], 'MAXLEN', '~', ARGV[3], '*', 'type', 'cancelled', 'data', ARGV[4])
redis.call('EXPIRE', KEYS[2], ARGV[2])
return 1
`

function jobKey(jobId: string) {
  return `vent-ai:inference:job:${jobId}`
}

function eventKey(jobId: string) {
  return `vent-ai:inference:job:${jobId}:events`
}

function idempotencyKey(value: string) {
  return `vent-ai:inference:idempotency:${value}`
}

function parsePayload(value: unknown): InferenceJobPayload | null {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as InferenceJobPayload
    } catch {
      return null
    }
  }
  return value && typeof value === 'object' ? value as InferenceJobPayload : null
}

function parseJob(value: Record<string, unknown> | null): InferenceJob | null {
  if (!value) return null
  const payload = parsePayload(value.payload)
  const status = value.status as InferenceJobStatus
  if (!payload || typeof value.id !== 'string' || typeof value.requestId !== 'string') return null
  if (!['queued', 'running', 'completed', 'failed', 'cancelled'].includes(status)) return null

  return {
    id: value.id,
    requestId: value.requestId,
    status,
    payload,
    attempt: Number(value.attempt ?? 0),
    createdAt: Number(value.createdAt),
    updatedAt: Number(value.updatedAt),
    error: typeof value.error === 'string' && value.error ? value.error : undefined,
  }
}

function fieldsToRecord(value: unknown): Record<string, unknown> {
  if (!Array.isArray(value)) return {}
  const record: Record<string, unknown> = {}
  for (let index = 0; index < value.length; index += 2) record[String(value[index])] = value[index + 1]
  return record
}

type QueueEntry = { id: string; jobId: string; requestId?: string }

function queueEntryFromRaw(value: unknown): QueueEntry | null {
  if (!Array.isArray(value) || typeof value[0] !== 'string') return null
  const fields = fieldsToRecord(value[1])
  return typeof fields.jobId === 'string'
    ? { id: value[0], jobId: fields.jobId, requestId: typeof fields.requestId === 'string' ? fields.requestId : undefined }
    : null
}

function newQueueEntry(value: unknown): QueueEntry | null {
  if (!Array.isArray(value)) return null
  const stream = value[0]
  if (!Array.isArray(stream) || !Array.isArray(stream[1])) return null
  return queueEntryFromRaw(stream[1][0])
}

function reclaimedQueueEntry(value: unknown): QueueEntry | null {
  if (!Array.isArray(value) || !Array.isArray(value[1])) return null
  return queueEntryFromRaw(value[1][0])
}

function parseEvent(id: string, value: Record<string, unknown>): InferenceEvent | null {
  const type = value.type
  let data = value.data
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data) as unknown
    } catch {
      return null
    }
  }
  if (!data || typeof data !== 'object') return null
  if (type !== 'reset' && type !== 'meta' && type !== 'token' && type !== 'complete' && type !== 'failed' && type !== 'cancelled') return null
  return { id, type, data } as InferenceEvent
}

export class RedisInferenceJobStore implements InferenceJobStore {
  private lastRecoveryScanAt = 0

  constructor(private readonly redis: Redis) {}

  async enqueue(params: { jobId: string; idempotencyKey: string; payload: InferenceJobPayload }) {
    const now = Date.now()
    const result = await this.redis.eval(ENQUEUE_SCRIPT, [
      idempotencyKey(params.idempotencyKey),
      jobKey(params.jobId),
      QUEUE_KEY,
    ], [
      params.jobId,
      params.payload.requestId,
      JSON.stringify(params.payload),
      String(now),
      String(INFERENCE_JOB_TTL_SECONDS),
    ]) as [string, string]

    return { jobId: result[0], created: result[1] === '1' }
  }

  async ensureConsumerGroup() {
    try {
      await this.redis.xgroup(QUEUE_KEY, {
        type: 'CREATE',
        group: CONSUMER_GROUP,
        id: '0',
        options: { MKSTREAM: true },
      })
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('BUSYGROUP')) throw error
    }
  }

  async claimNext(consumerName: string): Promise<ClaimedInferenceJob | null> {
    const result = await this.redis.xreadgroup(CONSUMER_GROUP, consumerName, QUEUE_KEY, '>', { count: 1 })
    const entry = newQueueEntry(result)
    if (entry) return this.resolveClaim(entry, false)

    if (Date.now() - this.lastRecoveryScanAt >= RECOVERY_SCAN_INTERVAL_MS) {
      this.lastRecoveryScanAt = Date.now()
      const reclaimed = reclaimedQueueEntry(await this.redis.xautoclaim(
        QUEUE_KEY,
        CONSUMER_GROUP,
        consumerName,
        INFERENCE_WORKER_LEASE_MS,
        '0-0',
        { count: 1 },
      ))
      if (reclaimed) return this.resolveClaim(reclaimed, true)
    }
    return null
  }

  async acknowledge(queueEntryId: string) {
    const pipeline = this.redis.pipeline()
    pipeline.xack(QUEUE_KEY, CONSUMER_GROUP, queueEntryId)
    pipeline.xdel(QUEUE_KEY, queueEntryId)
    await pipeline.exec()
  }

  async getJob(jobId: string) {
    return parseJob(await this.redis.hgetall<Record<string, unknown>>(jobKey(jobId)))
  }

  async markRunning(jobId: string) {
    const result = await this.redis.eval(MARK_RUNNING_SCRIPT, [jobKey(jobId)], [
      String(Date.now()),
      String(INFERENCE_JOB_TTL_SECONDS),
    ])
    const attempt = Number(result)
    return Number.isInteger(attempt) && attempt > 0 ? attempt : null
  }

  async publish(jobId: string, event: PublishableInferenceEvent) {
    const pipeline = this.redis.pipeline()
    pipeline.xadd(eventKey(jobId), '*', { type: event.type, data: event.data }, {
      trim: { type: 'MAXLEN', threshold: MAX_EVENT_ENTRIES, comparison: '~' },
    })
    pipeline.expire(eventKey(jobId), INFERENCE_JOB_TTL_SECONDS)
    pipeline.expire(jobKey(jobId), INFERENCE_JOB_TTL_SECONDS)
    const [eventId] = await pipeline.exec<[string, number, number]>()
    return eventId
  }

  async complete(jobId: string) {
    const now = Date.now()
    return this.terminal(jobId, 'running', 'completed', 'complete', '', { completedAt: now }, now)
  }

  async fail(jobId: string, message: string) {
    const now = Date.now()
    return this.terminal(jobId, 'running', 'failed', 'failed', message, { message }, now)
  }

  async cancel(jobId: string) {
    const now = Date.now()
    const result = await this.redis.eval(CANCEL_SCRIPT, [jobKey(jobId), eventKey(jobId)], [
      String(now),
      String(INFERENCE_JOB_TTL_SECONDS),
      String(MAX_EVENT_ENTRIES),
      JSON.stringify({ cancelledAt: now }),
    ])
    return Number(result) === 1
  }

  async isCancelled(jobId: string) {
    return await this.redis.hget(jobKey(jobId), 'status') === 'cancelled'
  }

  async readEvents(jobId: string, afterId: string, count = 100) {
    const start = afterId === '0-0' ? '-' : `(${afterId}`
    const entries = await this.redis.xrange<Record<string, Record<string, unknown>>>(eventKey(jobId), start, '+', count)
    return Object.entries(entries ?? {}).flatMap(([id, value]) => {
      const event = parseEvent(id, value)
      return event ? [event] : []
    })
  }

  private async terminal(
    jobId: string,
    expected: InferenceJobStatus,
    next: InferenceJobStatus,
    eventType: string,
    error: string,
    data: object,
    now: number,
  ) {
    const result = await this.redis.eval(TERMINAL_EVENT_SCRIPT, [jobKey(jobId), eventKey(jobId)], [
      expected,
      next,
      String(now),
      error,
      String(INFERENCE_JOB_TTL_SECONDS),
      String(MAX_EVENT_ENTRIES),
      eventType,
      JSON.stringify(data),
    ])
    return Number(result) === 1
  }

  private async resolveClaim(entry: QueueEntry, reclaimed: boolean): Promise<ClaimedInferenceJob | null> {
    let job = await this.getJob(entry.jobId)
    if (!job) {
      await this.acknowledge(entry.id)
      console.info('[vent.ai] worker.orphan_cleaned', {
        jobId: entry.jobId,
        requestId: entry.requestId,
        queueEntryId: entry.id,
      })
      return null
    }

    if (!reclaimed) return { queueEntryId: entry.id, job, reclaimed: false }

    if (job.status !== 'queued' && job.status !== 'running') {
      await this.acknowledge(entry.id)
      console.info('[vent.ai] worker.terminal_entry_cleaned', {
        jobId: job.id,
        requestId: job.requestId,
        queueEntryId: entry.id,
        status: job.status,
      })
      return null
    }

    if (job.attempt >= MAX_INFERENCE_ATTEMPTS) {
      if (job.status === 'running') {
        await this.fail(job.id, 'The response could not be recovered. Please try again.')
      }
      await this.acknowledge(entry.id)
      console.error('[vent.ai] worker.recovery_exhausted', {
        jobId: job.id,
        requestId: job.requestId,
        queueEntryId: entry.id,
        attempt: job.attempt,
      })
      return null
    }

    if (job.status === 'running') {
      const requeued = Number(await this.redis.eval(REQUEUE_STALE_SCRIPT, [jobKey(job.id)], [
        String(Date.now()),
        String(INFERENCE_JOB_TTL_SECONDS),
      ])) === 1
      if (!requeued) return null
      job = await this.getJob(job.id)
      if (!job) {
        await this.acknowledge(entry.id)
        return null
      }
    }

    console.info('[vent.ai] worker.job_reclaimed', {
      jobId: job.id,
      requestId: job.requestId,
      queueEntryId: entry.id,
      previousAttempt: job.attempt,
    })
    return { queueEntryId: entry.id, job, reclaimed: true }
  }
}
