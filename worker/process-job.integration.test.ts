import { describe, expect, it } from 'vitest'
import type { AICompletionRequest, AIProvider } from '@/lib/ai/provider'
import type { InferenceJobPayload } from '@/lib/inference/types'
import { InMemoryInferenceJobStore } from '@/tests/helpers/in-memory-inference-store'
import { processInferenceJob } from '@/worker/process-job'

const payload: InferenceJobPayload = {
  version: 1,
  requestId: 'request-1',
  command: {
    message: 'I need a clear next step',
    requestedPersona: 'aristotle',
    selectedPersona: 'aristotle',
    conversation: {
      messages: [{ index: 0, role: 'user', content: 'I need a clear next step' }],
    },
  },
}

const logger = { info() {}, error() {} }

class StreamingProvider implements AIProvider {
  readonly name = 'fake'
  constructor(private readonly tokens = ['First', ' ', 'response']) {}

  async complete() {
    return JSON.stringify({ level: 'normal', internalReason: 'No concern.', saferPersona: null })
  }

  async stream(_request: AICompletionRequest, signal?: AbortSignal) {
    const tokens = this.tokens
    return {
      async *[Symbol.asyncIterator]() {
        for (const token of tokens) {
          if (signal?.aborted) throw signal.reason
          yield token
        }
      },
    }
  }
}

async function enqueueAndClaim(store: InMemoryInferenceJobStore, jobId = 'job-1') {
  await store.enqueue({ jobId, idempotencyKey: 'key-1', payload })
  const claim = await store.claimNext('worker-1')
  if (!claim) throw new Error('Expected a claimed job')
  return claim
}

describe('inference worker pipeline', () => {
  it('deduplicates enqueueing and publishes ordered, replayable events', async () => {
    const store = new InMemoryInferenceJobStore()
    const first = await store.enqueue({ jobId: 'job-1', idempotencyKey: 'same-key', payload })
    const duplicate = await store.enqueue({ jobId: 'job-2', idempotencyKey: 'same-key', payload })
    expect(first).toEqual({ jobId: 'job-1', created: true })
    expect(duplicate).toEqual({ jobId: 'job-1', created: false })

    const claim = await store.claimNext('worker-1')
    if (!claim) throw new Error('Expected a claimed job')
    await processInferenceJob({ claim, store, provider: new StreamingProvider(), logger })

    const events = await store.readEvents('job-1', '0-0')
    expect(events.map((event) => event.type)).toEqual(['meta', 'token', 'token', 'complete'])
    expect(events.filter((event) => event.type === 'token').map((event) => event.data.text)).toEqual(['First', ' response'])
    await expect(store.readEvents('job-1', events[1].id)).resolves.toEqual(events.slice(2))
    await expect(store.getJob('job-1')).resolves.toMatchObject({ status: 'completed' })
    expect(store.acknowledgements).toHaveLength(1)
  })

  it('does not execute a job cancelled while queued', async () => {
    const store = new InMemoryInferenceJobStore()
    const claim = await enqueueAndClaim(store)
    await store.cancel('job-1')

    await processInferenceJob({ claim, store, provider: new StreamingProvider(), logger })

    await expect(store.getJob('job-1')).resolves.toMatchObject({ status: 'cancelled' })
    expect((await store.readEvents('job-1', '0-0')).map((event) => event.type)).toEqual(['cancelled'])
    expect(store.acknowledgements).toHaveLength(1)
  })

  it('observes cancellation during streaming and avoids completion', async () => {
    const store = new InMemoryInferenceJobStore()
    const claim = await enqueueAndClaim(store)
    const provider = new StreamingProvider()
    provider.stream = async (_request, signal) => ({
      async *[Symbol.asyncIterator]() {
        yield 'First'
        await new Promise<void>((_resolve, reject) => {
          signal?.addEventListener('abort', () => reject(signal.reason), { once: true })
        })
      },
    })

    const processing = processInferenceJob({ claim, store, provider, logger })
    while (!(await store.readEvents('job-1', '0-0')).some((event) => event.type === 'token')) {
      await new Promise((resolve) => setTimeout(resolve, 5))
    }
    await store.cancel('job-1')
    await processing

    await expect(store.getJob('job-1')).resolves.toMatchObject({ status: 'cancelled' })
    expect((await store.readEvents('job-1', '0-0')).map((event) => event.type)).toEqual([
      'meta',
      'token',
      'cancelled',
    ])
  })

  it('marks provider failures and emits a terminal failure event', async () => {
    const store = new InMemoryInferenceJobStore()
    const claim = await enqueueAndClaim(store)
    const provider = new StreamingProvider()
    provider.stream = async () => {
      throw new Error('provider unavailable')
    }

    await processInferenceJob({ claim, store, provider, logger })

    await expect(store.getJob('job-1')).resolves.toMatchObject({
      status: 'failed',
      error: 'Something went quiet. Try again in a moment.',
    })
    expect((await store.readEvents('job-1', '0-0')).map((event) => event.type)).toEqual(['meta', 'failed'])
  })

  it('restarts a crashed attempt with a reset event and preserves replay ordering', async () => {
    const store = new InMemoryInferenceJobStore()
    const originalClaim = await enqueueAndClaim(store)
    expect(await store.markRunning('job-1')).toBe(1)
    await store.publish('job-1', { id: '', type: 'token', data: { text: 'partial' } })

    const reclaimed = store.reclaimAfterCrash(originalClaim.queueEntryId, 'job-1')
    await processInferenceJob({ claim: reclaimed, store, provider: new StreamingProvider(), logger })

    const events = await store.readEvents('job-1', '0-0')
    expect(events.map((event) => event.type)).toEqual([
      'token',
      'reset',
      'meta',
      'token',
      'token',
      'complete',
    ])
    expect(events.find((event) => event.type === 'reset')?.data).toEqual({ attempt: 2 })
    await expect(store.readEvents('job-1', events[0].id)).resolves.toEqual(events.slice(1))
    await expect(store.getJob('job-1')).resolves.toMatchObject({ status: 'completed', attempt: 2 })
  })

  it('times out a job that waited beyond its queue deadline', async () => {
    const store = new InMemoryInferenceJobStore()
    const claim = await enqueueAndClaim(store)
    claim.job.createdAt = Date.now() - 100
    const provider = new StreamingProvider()
    let streamCalled = false
    provider.stream = async () => {
      streamCalled = true
      return {
        async *[Symbol.asyncIterator]() {
          yield 'unused'
        },
      }
    }

    await processInferenceJob({
      claim,
      store,
      provider,
      logger,
      limits: {
        maxQueuedMs: 10,
        maxExecutionMs: 1000,
        maxSseWaitMs: 1000,
        maxStallMs: 1000,
        workerLeaseMs: 2000,
      },
    })

    expect(streamCalled).toBe(false)
    await expect(store.getJob('job-1')).resolves.toMatchObject({
      status: 'timed_out',
      timeoutReason: 'queue_deadline',
    })
  })

  it('aborts the provider and publishes a timeout after the execution deadline', async () => {
    const store = new InMemoryInferenceJobStore()
    const claim = await enqueueAndClaim(store)
    const provider = new StreamingProvider()
    let providerWasAborted = false
    provider.stream = async (_request, signal) => ({
      async *[Symbol.asyncIterator]() {
        await new Promise<void>((_resolve, reject) => {
          signal?.addEventListener('abort', () => {
            providerWasAborted = true
            reject(signal.reason)
          }, { once: true })
        })
      },
    })

    await processInferenceJob({
      claim,
      store,
      provider,
      logger,
      limits: {
        maxQueuedMs: 1000,
        maxExecutionMs: 10,
        maxSseWaitMs: 1000,
        maxStallMs: 1000,
        workerLeaseMs: 2000,
      },
    })

    expect(providerWasAborted).toBe(true)
    await expect(store.getJob('job-1')).resolves.toMatchObject({
      status: 'timed_out',
      timeoutReason: 'execution_deadline',
    })
    expect((await store.readEvents('job-1', '0-0')).at(-1)?.type).toBe('timed_out')
  })
})
