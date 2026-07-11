import type { Redis } from '@upstash/redis'
import { describe, expect, it, vi } from 'vitest'
import { RedisInferenceJobStore } from '@/lib/inference/redis-job-store'
import { INFERENCE_LIMITS } from '@/lib/inference/config'
import type { InferenceJobPayload } from '@/lib/inference/types'
import { MAX_INFERENCE_ATTEMPTS } from '@/lib/inference/types'

const payload: InferenceJobPayload = {
  version: 1,
  requestId: 'request-1',
  command: {
    message: 'hello',
    requestedPersona: 'cotton',
    selectedPersona: 'cotton',
    conversation: { messages: [] },
  },
}

describe('Redis inference job store', () => {
  it('returns the existing job when atomic enqueue reports an idempotency hit', async () => {
    const evalCommand = vi.fn().mockResolvedValue(['existing-job', '0'])
    const store = new RedisInferenceJobStore({ eval: evalCommand } as unknown as Redis)

    await expect(store.enqueue({ jobId: 'new-job', idempotencyKey: 'same-request', payload })).resolves.toEqual({
      jobId: 'existing-job',
      created: false,
    })
    expect(evalCommand).toHaveBeenCalledOnce()
  })

  it('parses claimed jobs and replayable events from Redis Stream responses', async () => {
    const redis = {
      xreadgroup: vi.fn().mockResolvedValue([
        ['vent-ai:inference:queue', [['10-0', ['jobId', 'job-1', 'requestId', 'request-1']]]],
      ]),
      hgetall: vi.fn().mockResolvedValue({
        id: 'job-1',
        requestId: 'request-1',
        status: 'queued',
        payload,
        createdAt: 10,
        updatedAt: 10,
      }),
      xrange: vi.fn().mockResolvedValue({
        '11-0': { type: 'token', data: { text: 'one' } },
        '12-0': { type: 'token', data: JSON.stringify({ text: ' two' }) },
        '13-0': { type: 'complete', data: { completedAt: 13 } },
      }),
    }
    const store = new RedisInferenceJobStore(redis as unknown as Redis)

    await expect(store.claimNext('worker-1')).resolves.toMatchObject({
      queueEntryId: '10-0',
      job: { id: 'job-1', status: 'queued' },
    })
    await expect(store.readEvents('job-1', '10-0')).resolves.toEqual([
      { id: '11-0', type: 'token', data: { text: 'one' } },
      { id: '12-0', type: 'token', data: { text: ' two' } },
      { id: '13-0', type: 'complete', data: { completedAt: 13 } },
    ])
  })

  it('treats an existing consumer group as initialized', async () => {
    const redis = {
      xgroup: vi.fn().mockRejectedValue(new Error('BUSYGROUP Consumer Group name already exists')),
    }
    const store = new RedisInferenceJobStore(redis as unknown as Redis)

    await expect(store.ensureConsumerGroup()).resolves.toBeUndefined()
  })

  it('reclaims a stale pending job while retaining its identity and event stream', async () => {
    const runningJob = {
      id: 'job-1',
      requestId: 'request-1',
      status: 'running',
      payload,
      attempt: 1,
      createdAt: 10,
      updatedAt: 20,
    }
    const redis = {
      xreadgroup: vi.fn().mockResolvedValue(null),
      xautoclaim: vi.fn().mockResolvedValue([
        '0-0',
        [['20-0', ['jobId', 'job-1', 'requestId', 'request-1']]],
        [],
      ]),
      hgetall: vi.fn()
        .mockResolvedValueOnce(runningJob)
        .mockResolvedValueOnce({ ...runningJob, status: 'queued' }),
      eval: vi.fn().mockResolvedValue(1),
    }
    const store = new RedisInferenceJobStore(redis as unknown as Redis)

    await expect(store.claimNext('worker-2')).resolves.toMatchObject({
      queueEntryId: '20-0',
      reclaimed: true,
      job: { id: 'job-1', requestId: 'request-1', status: 'queued', attempt: 1 },
    })
    expect(redis.xautoclaim).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'worker-2',
      INFERENCE_LIMITS.workerLeaseMs,
      '0-0',
      { count: 1 },
    )
  })

  it('does not reclaim an entry whose lease is still active', async () => {
    const redis = {
      xreadgroup: vi.fn().mockResolvedValue(null),
      xautoclaim: vi.fn().mockResolvedValue(['0-0', [], []]),
    }
    const store = new RedisInferenceJobStore(redis as unknown as Redis)

    await expect(store.claimNext('worker-2')).resolves.toBeNull()
    expect(redis.xautoclaim).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'worker-2',
      INFERENCE_LIMITS.workerLeaseMs,
      '0-0',
      { count: 1 },
    )
  })

  it('fails and cleans up a stale job after the bounded attempt count', async () => {
    const redis = {
      xreadgroup: vi.fn().mockResolvedValue(null),
      xautoclaim: vi.fn().mockResolvedValue([
        '0-0',
        [['30-0', ['jobId', 'job-1', 'requestId', 'request-1']]],
        [],
      ]),
      hgetall: vi.fn().mockResolvedValue({
        id: 'job-1',
        requestId: 'request-1',
        status: 'running',
        payload,
        attempt: MAX_INFERENCE_ATTEMPTS,
        createdAt: 10,
        updatedAt: 20,
      }),
      eval: vi.fn().mockResolvedValue(1),
    }
    const store = new RedisInferenceJobStore(redis as unknown as Redis)

    await expect(store.claimNext('worker-3')).resolves.toBeNull()
    expect(redis.eval).toHaveBeenCalledTimes(2)
  })

  it('acknowledges and deletes an orphaned queue entry whose job expired', async () => {
    const redis = {
      xreadgroup: vi.fn().mockResolvedValue([
        ['queue', [['40-0', ['jobId', 'missing-job', 'requestId', 'request-1']]]],
      ]),
      hgetall: vi.fn().mockResolvedValue(null),
      eval: vi.fn().mockResolvedValue(1),
    }
    const store = new RedisInferenceJobStore(redis as unknown as Redis)

    await expect(store.claimNext('worker-1')).resolves.toBeNull()
    expect(redis.eval).toHaveBeenCalledOnce()
  })

  it('atomically publishes an event with activity and TTL renewal', async () => {
    const evalCommand = vi.fn().mockResolvedValue('50-0')
    const store = new RedisInferenceJobStore({ eval: evalCommand } as unknown as Redis)

    await expect(store.publish('job-1', {
      id: '',
      type: 'token',
      data: { text: 'combined token text' },
    })).resolves.toBe('50-0')
    expect(evalCommand).toHaveBeenCalledOnce()
    expect(evalCommand.mock.calls[0][1]).toHaveLength(2)
  })
})
