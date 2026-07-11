import { RedisInferenceJobStore } from '@/lib/inference/redis-job-store'
import type { InferenceEvent } from '@/lib/inference/types'
import { getRedis } from '@/lib/redis/client'

const POLL_INTERVAL_MS = 250 // Milliseconds to wait before polling for new events when none are available

function wait(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) return resolve()
    const timeout = setTimeout(resolve, milliseconds)
    signal.addEventListener('abort', () => {
      clearTimeout(timeout)
      resolve()
    }, { once: true })
  })
}

function encodeEvent(event: InferenceEvent) {
  return `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`
}

export async function GET(request: Request, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params
  const redis = getRedis()
  if (!redis) return Response.json({ error: 'Inference streaming is not configured.' }, { status: 503 })

  const store = new RedisInferenceJobStore(redis)
  const job = await store.getJob(jobId)
  if (!job) return Response.json({ error: 'Inference job not found.' }, { status: 404 })

  const url = new URL(request.url)
  let cursor = request.headers.get('last-event-id') || url.searchParams.get('after') || '0-0'
  const encoder = new TextEncoder()
  let closed = false

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      request.signal.addEventListener('abort', () => {
        closed = true
      }, { once: true })

      void (async () => {
        try {
          while (!closed && !request.signal.aborted) {
            const events = await store.readEvents(jobId, cursor)
            for (const event of events) {
              cursor = event.id
              controller.enqueue(encoder.encode(encodeEvent(event)))
              if (event.type === 'complete' || event.type === 'failed' || event.type === 'cancelled') {
                closed = true
                controller.close()
                return
              }
            }

            if (!events.length) await wait(POLL_INTERVAL_MS, request.signal)
          }

          if (!closed) controller.close()
        } catch (error) {
          if (!request.signal.aborted) controller.error(error)
        }
      })()
    },
    cancel() {
      closed = true
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Request-Id': job.requestId,
      'X-Inference-Job-Id': job.id,
    },
  })
}
