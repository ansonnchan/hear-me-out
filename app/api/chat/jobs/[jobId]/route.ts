import { RedisInferenceJobStore } from '@/lib/inference/redis-job-store'
import { getRedis } from '@/lib/redis/client'

export async function DELETE(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params
  const redis = getRedis()
  if (!redis) return Response.json({ error: 'Inference jobs are not configured.' }, { status: 503 })

  const store = new RedisInferenceJobStore(redis)
  const job = await store.getJob(jobId)
  if (!job) return Response.json({ error: 'Inference job not found.' }, { status: 404 })

  const cancelled = await store.cancel(jobId)
  const current = cancelled ? await store.getJob(jobId) : job
  console.info('[vent.ai] api.chat.cancelled', { requestId: job.requestId, jobId, cancelled })

  return Response.json({ jobId, status: current?.status ?? job.status })
}
