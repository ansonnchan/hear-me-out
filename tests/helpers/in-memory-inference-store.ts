import type { InferenceJobStore } from '@/lib/inference/job-store'
import type {
  ClaimedInferenceJob,
  InferenceEvent,
  InferenceJob,
  InferenceJobPayload,
  PublishableInferenceEvent,
  InferenceJobStatus,
  InferenceTimeoutReason,
} from '@/lib/inference/types'

export class InMemoryInferenceJobStore implements InferenceJobStore {
  private readonly jobs = new Map<string, InferenceJob>()
  private readonly idempotency = new Map<string, string>()
  private readonly queue: Array<{ id: string; jobId: string }> = []
  private readonly events = new Map<string, InferenceEvent[]>()
  private sequence = 0
  readonly acknowledgements: string[] = []

  async enqueue(params: { jobId: string; idempotencyKey: string; payload: InferenceJobPayload }) {
    const existing = this.idempotency.get(params.idempotencyKey)
    if (existing) return { jobId: existing, created: false }

    const now = Date.now()
    this.idempotency.set(params.idempotencyKey, params.jobId)
    this.jobs.set(params.jobId, {
      id: params.jobId,
      requestId: params.payload.requestId,
      status: 'queued',
      payload: params.payload,
      attempt: 0,
      createdAt: now,
      updatedAt: now,
    })
    this.queue.push({ id: this.nextId(), jobId: params.jobId })
    return { jobId: params.jobId, created: true }
  }

  async ensureConsumerGroup() {}

  async claimNext(_consumerName: string): Promise<ClaimedInferenceJob | null> {
    const entry = this.queue.shift()
    if (!entry) return null
    const job = this.jobs.get(entry.jobId)
    return job ? { queueEntryId: entry.id, job: { ...job }, reclaimed: false } : null
  }

  async acknowledge(queueEntryId: string) {
    this.acknowledgements.push(queueEntryId)
  }

  async getJob(jobId: string) {
    const job = this.jobs.get(jobId)
    return job ? { ...job } : null
  }

  async getStatus(jobId: string): Promise<InferenceJobStatus | null> {
    return this.jobs.get(jobId)?.status ?? null
  }

  async markRunning(jobId: string) {
    const job = this.jobs.get(jobId)
    if (!job || job.status !== 'queued') return null
    job.attempt += 1
    job.status = 'running'
    job.updatedAt = Date.now()
    return job.attempt
  }

  async publish(jobId: string, event: PublishableInferenceEvent) {
    const job = this.jobs.get(jobId)
    if (!job || job.status !== 'running') return null
    job.updatedAt = Date.now()
    return this.append(jobId, event.type, event.data)
  }

  async complete(jobId: string) {
    return this.finish(jobId, 'completed', 'complete', { completedAt: Date.now() })
  }

  async fail(jobId: string, message: string) {
    const job = this.jobs.get(jobId)
    if (job) job.error = message
    return this.finish(jobId, 'failed', 'failed', { message })
  }

  async timeout(jobId: string, expected: 'queued' | 'running', reason: InferenceTimeoutReason) {
    const job = this.jobs.get(jobId)
    if (!job || job.status !== expected) return false
    const message = reason === 'queue_deadline'
      ? 'The response took too long to start. Please try again.'
      : 'The response took too long. Please try again.'
    job.status = 'timed_out'
    job.error = message
    job.timeoutReason = reason
    job.updatedAt = Date.now()
    this.append(jobId, 'timed_out', { message, reason, timedOutAt: job.updatedAt })
    return true
  }

  async cancel(jobId: string) {
    const job = this.jobs.get(jobId)
    if (!job || (job.status !== 'queued' && job.status !== 'running')) return false
    job.status = 'cancelled'
    job.updatedAt = Date.now()
    this.append(jobId, 'cancelled', { cancelledAt: job.updatedAt })
    return true
  }

  async readEvents(jobId: string, afterId: string, count = 100) {
    return (this.events.get(jobId) ?? [])
      .filter((event) => Number(event.id.split('-')[0]) > Number(afterId.split('-')[0]))
      .slice(0, count)
  }

  reclaimAfterCrash(queueEntryId: string, jobId: string): ClaimedInferenceJob {
    const job = this.jobs.get(jobId)
    if (!job || job.status !== 'running') throw new Error('Expected a running job to reclaim')
    job.status = 'queued'
    job.updatedAt = Date.now()
    return { queueEntryId, job: { ...job }, reclaimed: true }
  }

  setTimes(jobId: string, times: { createdAt?: number; updatedAt?: number }) {
    const job = this.jobs.get(jobId)
    if (!job) throw new Error('Expected job')
    if (times.createdAt !== undefined) job.createdAt = times.createdAt
    if (times.updatedAt !== undefined) job.updatedAt = times.updatedAt
  }

  private finish(jobId: string, status: 'completed' | 'failed', type: 'complete' | 'failed', data: object) {
    const job = this.jobs.get(jobId)
    if (!job || job.status !== 'running') return false
    job.status = status
    job.updatedAt = Date.now()
    this.append(jobId, type, data)
    return true
  }

  private append(jobId: string, type: InferenceEvent['type'], data: object) {
    const id = this.nextId()
    const event = { id, type, data } as InferenceEvent
    this.events.set(jobId, [...(this.events.get(jobId) ?? []), event])
    return id
  }

  private nextId() {
    this.sequence += 1
    return `${this.sequence}-0`
  }
}
