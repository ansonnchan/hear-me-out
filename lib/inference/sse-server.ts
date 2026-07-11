import { abortableDelay } from '@/lib/inference/abortable-delay'
import { INFERENCE_LIMITS, type InferenceLimits } from '@/lib/inference/config'
import type { InferenceJobStore } from '@/lib/inference/job-store'
import type { InferenceEvent, InferenceJob } from '@/lib/inference/types'

function encodeEvent(event: InferenceEvent) {
  return `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`
}

function terminalEvent(job: InferenceJob, id: string): InferenceEvent | null {
  if (job.status === 'completed') return { id, type: 'complete', data: { completedAt: job.updatedAt } }
  if (job.status === 'failed') {
    return { id, type: 'failed', data: { message: job.error ?? 'Something went quiet. Try again in a moment.' } }
  }
  if (job.status === 'cancelled') return { id, type: 'cancelled', data: { cancelledAt: job.updatedAt } }
  if (job.status === 'timed_out') {
    return {
      id,
      type: 'timed_out',
      data: {
        message: job.error ?? 'The response took too long. Please try again.',
        reason: job.timeoutReason ?? 'execution_deadline',
        timedOutAt: job.updatedAt,
      },
    }
  }
  return null
}

export function createInferenceEventStream(params: {
  store: InferenceJobStore
  jobId: string
  initialCursor?: string
  signal: AbortSignal
  limits?: InferenceLimits
  pollIntervalMs?: number
}) {
  const {
    store,
    jobId,
    signal,
    limits = INFERENCE_LIMITS,
    pollIntervalMs = 250,
  } = params
  let cursor = params.initialCursor || '0-0'
  const connectedAt = Date.now()
  const encoder = new TextEncoder()
  let closed = false
  let removeAbortListener = () => {}

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const onAbort = () => {
        closed = true
      }
      signal.addEventListener('abort', onAbort, { once: true })
      removeAbortListener = () => signal.removeEventListener('abort', onAbort)

      const closeWith = (event: InferenceEvent) => {
        controller.enqueue(encoder.encode(encodeEvent(event)))
        closed = true
        removeAbortListener()
        controller.close()
      }

      void (async () => {
        try {
          while (!closed && !signal.aborted) {
            const events = await store.readEvents(jobId, cursor)
            for (const event of events) {
              cursor = event.id
              controller.enqueue(encoder.encode(encodeEvent(event)))
              if (event.type === 'complete' || event.type === 'failed' || event.type === 'cancelled' || event.type === 'timed_out') {
                closed = true
                removeAbortListener()
                controller.close()
                return
              }
            }

            const job = await store.getJob(jobId)
            if (!job) {
              closeWith({
                id: cursor,
                type: 'expired',
                data: { message: 'This response expired. Please try again.', expiredAt: Date.now() },
              })
              return
            }

            const terminal = terminalEvent(job, cursor)
            if (terminal) {
              closeWith(terminal)
              return
            }

            const now = Date.now()
            if (job.status === 'queued' && now - job.createdAt >= limits.maxQueuedMs) {
              await store.timeout(jobId, 'queued', 'queue_deadline')
              continue
            }
            if (job.status === 'running' && now - job.updatedAt >= limits.maxStallMs) {
              await store.timeout(jobId, 'running', 'stalled')
              continue
            }
            if (now - connectedAt >= limits.maxSseWaitMs) {
              if (job.status === 'queued' || job.status === 'running') {
                await store.timeout(jobId, job.status, 'sse_deadline')
              }
              continue
            }

            await abortableDelay(pollIntervalMs, signal)
          }
        } catch (error) {
          removeAbortListener()
          if (!signal.aborted) controller.error(error)
        }
      })()
    },
    cancel() {
      closed = true
      removeAbortListener()
    },
  })
}
