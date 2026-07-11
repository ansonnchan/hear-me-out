import { RedisInferenceJobStore } from '@/lib/inference/redis-job-store'
import { createInferenceEventStream } from '@/lib/inference/sse-server'
import { getRedis } from '@/lib/redis/client'

export async function GET(request: Request, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params
  const redis = getRedis()
  if (!redis) return Response.json({ error: 'Inference streaming is not configured.' }, { status: 503 })

  const store = new RedisInferenceJobStore(redis)
  const job = await store.getJob(jobId)
  const url = new URL(request.url)
  const cursor = request.headers.get('last-event-id') || url.searchParams.get('after') || '0-0'
  const stream = createInferenceEventStream({ store, jobId, initialCursor: cursor, signal: request.signal })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      ...(job ? { 'X-Request-Id': job.requestId } : {}),
      'X-Inference-Job-Id': jobId,
    },
  })
}
