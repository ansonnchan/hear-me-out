import { Redis } from '@upstash/redis'

let redis: Redis | null | undefined

export function isRedisConfigured() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

export function getRedis(): Redis | null {
  if (redis !== undefined) return redis
  redis = isRedisConfigured() ? Redis.fromEnv({ enableTelemetry: false }) : null
  return redis
}
