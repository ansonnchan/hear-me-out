import { NextResponse } from 'next/server'
import { getAIProvider } from '@/lib/ai/provider-factory'
import { prepareChat } from '@/lib/chat/application-service'
import { parseChatCommand, type ChatRequestBody } from '@/lib/chat/contracts'
import type { CompressedContext } from '@/lib/conversation/domain'
import { applyRateLimitHeaders, checkChatRateLimit } from '@/lib/rate-limit'
import { personalities, type PersonalityKey } from '@/lib/personalities'

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

function mockResponse(personality: PersonalityKey, safetyLevel: 'normal' | 'elevated_distress' | 'urgent_safety') {
  if (safetyLevel === 'urgent_safety') {
    return 'I am really glad you wrote this down instead of carrying it alone. If you may be in immediate danger, please contact local emergency services or someone you trust right now, and keep your next step very small and safe. You do not have to solve the whole night at once; you only need to get through this next moment with support nearby.'
  }

  const copy: Record<PersonalityKey, string> = {
    cotton: 'Let it be messy for a moment. You do not have to make it smaller before it is allowed to be held. I am here with the feeling first, before advice, before cleanup, before anyone asks you to be easier to understand.',
    aristotle: 'The first useful move is to separate the feeling from the question. Something in this matters to you, and something in it feels uncertain. Stay with the central issue, then take the next small step that reduces confusion rather than trying to solve the whole knot at once.',
    'venerable-ming': 'Let the mind set down what it has been carrying. Not everything asks to be solved tonight. A journey of a thousand miles begins with a single step, and sometimes the first step is simply seeing the ground beneath you again.',
    angel: 'I want you to notice that you are still trying to name the truth instead of abandoning yourself inside it. That matters. Whatever this day has asked of you, you are not weak for needing tenderness around it.',
    'auntie-zhang': 'Be honest with yourself, but do not be cruel. The next move does not need drama. Choose one concrete action you can stand behind, do it cleanly, and let that prove to you that you are not as stuck as the feeling says.',
  }

  return copy[personality] ?? `${personalities[personality].name} is listening. Give the thought a little more room.`
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
