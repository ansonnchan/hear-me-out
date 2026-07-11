import { createHash } from 'crypto'
import { Ratelimit } from '@upstash/ratelimit'
import { getRedis } from '@/lib/redis/client'

const CHAT_RATE_LIMIT = 10
const CHAT_RATE_LIMIT_WINDOW = '1 m'

type ChatRateLimitResult = {
  configured: boolean
  identifier: string
  success: boolean
  limit: number
  remaining: number
  reset: number
}

let chatRatelimit: Ratelimit | null = null

function hasUpstashEnv() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

function getChatRatelimit() {
  if (!hasUpstashEnv()) return null
  const redis = getRedis()
  if (!redis) return null

  chatRatelimit ??= new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(CHAT_RATE_LIMIT, CHAT_RATE_LIMIT_WINDOW),
    analytics: true,
    prefix: 'vent-ai:chat',
  })

  return chatRatelimit
}

function hashIdentifier(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 24)
}

export function getRateLimitIdentifier(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = request.headers.get('x-real-ip')?.trim()
  const userAgent = request.headers.get('user-agent') ?? 'unknown-agent'
  const ip = forwardedFor || realIp || 'anonymous'

  return hashIdentifier(`${ip}:${userAgent}`)
}

export async function checkChatRateLimit(request: Request): Promise<ChatRateLimitResult> {
  const identifier = getRateLimitIdentifier(request)
  const ratelimit = getChatRatelimit()

  if (!ratelimit) {
    return {
      configured: false,
      identifier,
      success: true,
      limit: CHAT_RATE_LIMIT,
      remaining: CHAT_RATE_LIMIT,
      reset: Date.now() + 60_000,
    }
  }

  const result = await ratelimit.limit(identifier)
  result.pending.catch((error) => {
    console.error('[vent.ai] rate_limit.analytics_failed', error)
  })

  return {
    configured: true,
    identifier,
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  }
}

export function applyRateLimitHeaders(headers: Headers, result: ChatRateLimitResult) {
  headers.set('X-RateLimit-Configured', String(result.configured))
  headers.set('X-RateLimit-Limit', String(result.limit))
  headers.set('X-RateLimit-Remaining', String(Math.max(0, result.remaining)))
  headers.set('X-RateLimit-Reset', String(result.reset))

  if (!result.success) {
    const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))
    headers.set('Retry-After', String(retryAfter))
  }
}
