import type { Redis } from '@upstash/redis'
import { describe, expect, it, vi } from 'vitest'
import { RedisInferenceJobStore } from '@/lib/inference/redis-job-store'
import type { InferenceJobPayload } from '@/lib/inference/types'

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
})
