import { describe, expect, it } from 'vitest'
import type { InferenceLimits } from '@/lib/inference/config'
import { createInferenceEventStream } from '@/lib/inference/sse-server'
import type { InferenceJobPayload } from '@/lib/inference/types'
import { InMemoryInferenceJobStore } from '@/tests/helpers/in-memory-inference-store'

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

const generousLimits: InferenceLimits = {
  maxQueuedMs: 60_000,
  maxExecutionMs: 60_000,
  maxSseWaitMs: 60_000,
  maxStallMs: 60_000,
  workerLeaseMs: 65_000,
}

async function jobStore(status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timed_out') {
  const store = new InMemoryInferenceJobStore()
  await store.enqueue({ jobId: 'job-1', idempotencyKey: 'key-1', payload })
  if (status === 'queued') return store
  const claim = await store.claimNext('worker-1')
  if (!claim) throw new Error('Expected claim')
  await store.markRunning('job-1')
  if (status === 'running') return store
  if (status === 'completed') await store.complete('job-1')
  if (status === 'failed') await store.fail('job-1', 'failed response')
  if (status === 'cancelled') await store.cancel('job-1')
  if (status === 'timed_out') await store.timeout('job-1', 'running', 'execution_deadline')
  return store
}

async function eventTypes(store: InMemoryInferenceJobStore, limits = generousLimits) {
  const controller = new AbortController()
  const stream = createInferenceEventStream({
    store,
    jobId: 'job-1',
    signal: controller.signal,
    limits,
    pollIntervalMs: 1,
  })
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let content = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    content += decoder.decode(value, { stream: true })
  }
  return Array.from(content.matchAll(/^event: (.+)$/gm), (match) => match[1])
}

describe('server SSE terminal behavior', () => {
  it.each(['completed', 'failed', 'cancelled', 'timed_out'] as const)(
    'closes for a %s job',
    async (status) => expect(await eventTypes(await jobStore(status))).toContain(
      status === 'completed' ? 'complete' : status,
    ),
  )

  it('closes with expired when the job no longer exists', async () => {
    expect(await eventTypes(new InMemoryInferenceJobStore())).toEqual(['expired'])
  })

  it('times out and closes an expired queued job', async () => {
    const store = await jobStore('queued')
    store.setTimes('job-1', { createdAt: Date.now() - 100 })

    expect(await eventTypes(store, { ...generousLimits, maxQueuedMs: 10 })).toContain('timed_out')
    await expect(store.getJob('job-1')).resolves.toMatchObject({
      status: 'timed_out',
      timeoutReason: 'queue_deadline',
    })
  })

  it('times out and closes an irrecoverably stalled running job', async () => {
    const store = await jobStore('running')
    store.setTimes('job-1', { updatedAt: Date.now() - 100 })

    expect(await eventTypes(store, { ...generousLimits, maxStallMs: 10 })).toContain('timed_out')
    await expect(store.getJob('job-1')).resolves.toMatchObject({
      status: 'timed_out',
      timeoutReason: 'stalled',
    })
  })

  it('bounds the total SSE wait for an otherwise active job', async () => {
    const store = await jobStore('running')

    expect(await eventTypes(store, {
      ...generousLimits,
      maxSseWaitMs: 5,
      maxStallMs: 60_000,
    })).toContain('timed_out')
    await expect(store.getJob('job-1')).resolves.toMatchObject({
      status: 'timed_out',
      timeoutReason: 'sse_deadline',
    })
  })
})
