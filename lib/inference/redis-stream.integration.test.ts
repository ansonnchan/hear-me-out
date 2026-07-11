import { loadEnvConfig } from '@next/env'
import { Redis } from '@upstash/redis'
import { describe, expect, it } from 'vitest'

loadEnvConfig(process.cwd())

const enabled = process.env.RUN_REDIS_INTEGRATION_TESTS === 'true'
  && Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

describe.skipIf(!enabled)('Redis Stream consumer-group integration', () => {
  it('reclaims a pending entry with XAUTOCLAIM', async () => {
    const redis = Redis.fromEnv({ enableTelemetry: false, readYourWrites: true })
    const stream = `vent-ai:test:reclaim:${crypto.randomUUID()}`
    const group = 'workers'

    try {
      await redis.xgroup(stream, { type: 'CREATE', group, id: '0', options: { MKSTREAM: true } })
      const entryId = await redis.xadd(stream, '*', { jobId: 'job-1' })
      await redis.xreadgroup(group, 'worker-1', stream, '>', { count: 1 })

      const result = await redis.xautoclaim(stream, group, 'worker-2', 0, '0-0', { count: 1 })
      expect(JSON.stringify(result)).toContain(entryId)
    } finally {
      await redis.del(stream)
    }
  })
})
