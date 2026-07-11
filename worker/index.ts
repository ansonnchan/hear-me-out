import { loadEnvConfig } from '@next/env'

async function main() {
  loadEnvConfig(process.cwd())

  const [{ getAIProvider }, { RedisInferenceJobStore }, { getRedis }, { runInferenceWorker }] = await Promise.all([
    import('@/lib/ai/provider-factory'),
    import('@/lib/inference/redis-job-store'),
    import('@/lib/redis/client'),
    import('@/worker/run-worker'),
  ])

  const redis = getRedis()
  if (!redis) throw new Error('The inference worker requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.')

  const controller = new AbortController()
  process.once('SIGINT', () => controller.abort())
  process.once('SIGTERM', () => controller.abort())

  await runInferenceWorker({
    store: new RedisInferenceJobStore(redis),
    provider: getAIProvider(),
    signal: controller.signal,
  })
}

void main().catch((error) => {
  console.error('[vent.ai] worker.startup_failed', error)
  process.exitCode = 1
})
