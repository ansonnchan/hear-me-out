import { NextResponse } from 'next/server'
import { getAIProvider } from '@/lib/ai/provider-factory'
import { prepareChat } from '@/lib/chat/application-service'
import { parseChatCommand, type ChatRequestBody } from '@/lib/chat/contracts'
import { mockResponse } from '@/lib/chat/mock-response'
import type { CompressedContext } from '@/lib/conversation/domain'
import { isInferenceWorkerEnabled } from '@/lib/inference/config'
import { RedisInferenceJobStore } from '@/lib/inference/redis-job-store'
import { applyRateLimitHeaders, checkChatRateLimit } from '@/lib/rate-limit'
import { getRedis } from '@/lib/redis/client'
import type { PersonalityKey } from '@/lib/personalities'

type RateLimitResult = Awaited<ReturnType<typeof checkChatRateLimit>>

type ChatResponseMeta = {
  requestedPersona: PersonalityKey
  finalPersona: PersonalityKey
  personaSuggestion?: Awaited<ReturnType<typeof prepareChat>>['personaSuggestion']
  safetyNote?: string
  compressedContext?: CompressedContext
  contextCompressed?: boolean
}

function requestId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function jsonHeaders(id: string, rateLimit: RateLimitResult | null) {
  const headers = new Headers({ 'X-Request-Id': id })
  if (rateLimit) applyRateLimitHeaders(headers, rateLimit)
  return headers
}

function streamHeaders(id: string, rateLimit: RateLimitResult | null) {
  const headers = new Headers({
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no',
    'X-Request-Id': id,
  })

  if (rateLimit) applyRateLimitHeaders(headers, rateLimit)
  return headers
}

function quietError(status: number, headers?: Headers) {
  return NextResponse.json({ error: 'Something went quiet. Try again in a moment.' }, { status, headers })
}

function streamText(text: string, onComplete?: () => void) {
  const encoder = new TextEncoder()

  return new ReadableStream({
    start(controller) {
      for (const chunk of text.split(/(\s+)/)) controller.enqueue(encoder.encode(chunk))
      controller.close()
      onComplete?.()
    },
  })
}

function encodeMetaHeader(meta: ChatResponseMeta) {
  return encodeURIComponent(JSON.stringify(meta))
}

export async function POST(request: Request) {
  const id = requestId()
  const requestStartedAt = performance.now()
  const provider = getAIProvider()
  let rateLimit: RateLimitResult | null = null

  try {
    rateLimit = await checkChatRateLimit(request)
  } catch (error) {
    console.error('[vent.ai] api.chat.rate_limit_failed', { requestId: id, error })
  }

  if (rateLimit && !rateLimit.success) {
    return NextResponse.json(
      { error: 'Take a breath. Try again in a moment.' },
      { status: 429, headers: jsonHeaders(id, rateLimit) },
    )
  }

  let body: ChatRequestBody
  try {
    body = (await request.json()) as ChatRequestBody
  } catch {
    return quietError(400, jsonHeaders(id, rateLimit))
  }

  const parsed = parseChatCommand(body)
  if (!parsed.ok) {
    if (parsed.reason === 'empty_message') {
      return NextResponse.json(
        { error: 'Write something first. Even one sentence.' },
        { status: 400, headers: jsonHeaders(id, rateLimit) },
      )
    }

    return quietError(400, jsonHeaders(id, rateLimit))
  }

  const redis = getRedis()
  if (isInferenceWorkerEnabled()) {
    if (!redis) {
      console.error('[vent.ai] api.chat.worker_not_configured', { requestId: id })
      return quietError(503, jsonHeaders(id, rateLimit))
    }

    const store = new RedisInferenceJobStore(redis)
    const jobId = crypto.randomUUID()
    const suppliedIdempotencyKey = request.headers.get('idempotency-key')?.trim().slice(0, 160)

    try {
      const enqueued = await store.enqueue({
        jobId,
        idempotencyKey: suppliedIdempotencyKey || id,
        payload: {
          version: 1,
          requestId: id,
          command: parsed.command,
        },
      })
      const job = await store.getJob(enqueued.jobId)
      const jobRequestId = job?.requestId ?? id
      const headers = jsonHeaders(jobRequestId, rateLimit)
      headers.set('X-Inference-Mode', 'worker')
      headers.set('X-Inference-Job-Id', enqueued.jobId)

      console.info('[vent.ai] api.chat.enqueued', {
        requestId: jobRequestId,
        jobId: enqueued.jobId,
        deduplicated: !enqueued.created,
      })

      return NextResponse.json({
        jobId: enqueued.jobId,
        requestId: jobRequestId,
        eventsUrl: `/api/chat/jobs/${enqueued.jobId}/events`,
        deduplicated: !enqueued.created,
      }, { status: 202, headers })
    } catch (error) {
      console.error('[vent.ai] api.chat.enqueue_failed', { requestId: id, error })
      return quietError(503, jsonHeaders(id, rateLimit))
    }
  }

  if (!provider && process.env.NODE_ENV === 'production') {
    console.error('[vent.ai] api.chat.provider_not_configured', { requestId: id })
    return NextResponse.json(
      { error: 'The AI response service is not configured. Please try again later.' },
      { status: 503, headers: jsonHeaders(id, rateLimit) },
    )
  }

  let prepared: Awaited<ReturnType<typeof prepareChat>>
  try {
    prepared = await prepareChat(parsed.command, provider)
  } catch (error) {
    console.error('[vent.ai] api.chat.preparation_failed', { requestId: id, error })
    return quietError(503, jsonHeaders(id, rateLimit))
  }

  const headers = streamHeaders(id, rateLimit)
  headers.set('X-Vent-Meta', encodeMetaHeader({
    requestedPersona: prepared.requestedPersona,
    finalPersona: prepared.finalPersona,
    personaSuggestion: prepared.personaSuggestion,
    safetyNote: prepared.safetyRoute.userFacingNote,
    compressedContext: prepared.nextCompressedContext,
    contextCompressed: Boolean(prepared.nextCompressedContext),
  }))

  if (!provider) {
    headers.set('X-AI-Provider', 'mock')
    headers.set('Server-Timing', `vent_prep;dur=${Math.round(performance.now() - requestStartedAt)}`)

    return new Response(
      streamText(mockResponse(prepared.finalPersona, prepared.safetyRoute.level), () => {
        console.info('[vent.ai] api.chat.completed', {
          requestId: id,
          personality: prepared.finalPersona,
          provider: 'mock',
          serverTtftMs: 0,
          totalMs: Math.round(performance.now() - requestStartedAt),
        })
      }),
      { headers },
    )
  }

  try {
    headers.set('X-AI-Provider', provider.name)
    const completion = await provider.stream(prepared.completionRequest)
    headers.set('Server-Timing', `vent_prep;dur=${Math.round(performance.now() - requestStartedAt)}`)
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        let firstTokenAt: number | null = null

        try {
          for await (const delta of completion) {
            if (!firstTokenAt) {
              firstTokenAt = performance.now()
              console.info('vent.ai ttft_ms', Math.round(firstTokenAt - requestStartedAt))
            }
            controller.enqueue(encoder.encode(delta))
          }

          controller.close()
          console.info('[vent.ai] api.chat.completed', {
            requestId: id,
            personality: prepared.finalPersona,
            provider: provider.name,
            serverTtftMs: firstTokenAt ? Math.round(firstTokenAt - requestStartedAt) : null,
            totalMs: Math.round(performance.now() - requestStartedAt),
          })
        } catch (error) {
          console.error('[vent.ai] api.chat.stream_failed', {
            requestId: id,
            personality: prepared.finalPersona,
            error,
          })
          controller.error(error)
        }
      },
    })

    return new Response(stream, { headers })
  } catch (error) {
    console.error('[vent.ai] api.chat.provider_failed', { requestId: id, personality: prepared.finalPersona, error })
    return quietError(503, jsonHeaders(id, rateLimit))
  }
}
