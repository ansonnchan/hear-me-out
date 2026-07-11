import { NextResponse } from 'next/server'
import { compressContext, type CompressedContext } from '@/lib/ai/context-compressor'
import { routePersona, type PersonaRouteResult, type PersonalityId } from '@/lib/ai/persona-router'
import { getAIProvider } from '@/lib/ai/provider-factory'
import type { AIProvider } from '@/lib/ai/provider'
import { routeSafety, type SafetyRouteResult } from '@/lib/ai/safety-router'
import { applyRateLimitHeaders, checkChatRateLimit } from '@/lib/rate-limit'
import { getPersonalityPrompt, normalizePersonalityKey, personalities, type PersonalityKey } from '@/lib/personalities'

interface ChatRequestBody {
  message?: unknown
  personality?: unknown
  messages?: unknown
  compressedContext?: unknown
  acceptedSuggestedPersona?: unknown
  suggestedPersona?: unknown
}

type SessionMessage = {
  index: number
  role: 'user' | 'assistant'
  content: string
  personality?: PersonalityKey
}

type RateLimitResult = Awaited<ReturnType<typeof checkChatRateLimit>>

type ChatResponseMeta = {
  requestedPersona: PersonalityKey
  finalPersona: PersonalityKey
  personaSuggestion?: PersonaRouteResult
  safetyNote?: string
  compressedContext?: CompressedContext
  contextCompressed?: boolean
}

const RAW_MESSAGE_WINDOW = 12
const MAX_SESSION_MESSAGES = 48
const MAX_MESSAGE_CHARS = 5000
const RESPONSE_WORD_LIMIT = 160

function requestId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function jsonHeaders(id: string, rateLimit: RateLimitResult | null) {
  const headers = new Headers()
  headers.set('X-Request-Id', id)
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
  const chunks = text.split(/(\s+)/)

  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }

      controller.close()
      onComplete?.()
    },
  })
}

function mockResponse(personality: PersonalityKey, safetyLevel: SafetyRouteResult['level']) {
  if (safetyLevel === 'urgent_safety') {
    return `I am really glad you wrote this down instead of carrying it alone. If you may be in immediate danger, please contact local emergency services or someone you trust right now, and keep your next step very small and safe. You do not have to solve the whole night at once; you only need to get through this next moment with support nearby.`
  }

  const copy: Record<PersonalityKey, string> = {
    cotton: `Let it be messy for a moment. You do not have to make it smaller before it is allowed to be held. I am here with the feeling first, before advice, before cleanup, before anyone asks you to be easier to understand.`,
    aristotle: `The first useful move is to separate the feeling from the question. Something in this matters to you, and something in it feels uncertain. Stay with the central issue, then take the next small step that reduces confusion rather than trying to solve the whole knot at once.`,
    'venerable-ming': `Let the mind set down what it has been carrying. Not everything asks to be solved tonight. A journey of a thousand miles begins with a single step, and sometimes the first step is simply seeing the ground beneath you again.`,
    angel: `I want you to notice that you are still trying to name the truth instead of abandoning yourself inside it. That matters. Whatever this day has asked of you, you are not weak for needing tenderness around it.`,
    'auntie-zhang': `Be honest with yourself, but do not be cruel. The next move does not need drama. Choose one concrete action you can stand behind, do it cleanly, and let that prove to you that you are not as stuck as the feeling says.`,
  }

  return copy[personality] ?? `${personalities[personality].name} is listening. Give the thought a little more room.`
}

function parseSessionMessages(value: unknown): SessionMessage[] {
  if (!Array.isArray(value)) return []

  return value
    .flatMap((item, arrayIndex): SessionMessage[] => {
      if (!item || typeof item !== 'object') return []

      const candidate = item as Record<string, unknown>
      const role = candidate.role === 'user' || candidate.role === 'assistant' ? candidate.role : null
      const content = typeof candidate.content === 'string' ? candidate.content.trim().slice(0, MAX_MESSAGE_CHARS) : ''
      const personality = normalizePersonalityKey(candidate.personality)
      const index = typeof candidate.index === 'number' && Number.isSafeInteger(candidate.index) ? candidate.index : arrayIndex

      if (!role || !content) return []

      return [
        {
          index,
          role,
          content,
          personality: personality ?? undefined,
        },
      ]
    })
    .sort((a, b) => a.index - b.index)
    .slice(-MAX_SESSION_MESSAGES)
}

function parseCompressedContext(value: unknown): CompressedContext | undefined {
  if (!value || typeof value !== 'object') return undefined

  const candidate = value as Partial<CompressedContext>
  const summary = typeof candidate.summary === 'string' ? candidate.summary.trim().slice(0, 900) : ''
  const lastCompressedMessageIndex =
    typeof candidate.lastCompressedMessageIndex === 'number' && Number.isSafeInteger(candidate.lastCompressedMessageIndex)
      ? candidate.lastCompressedMessageIndex
      : -1
  const updatedAt = typeof candidate.updatedAt === 'number' && Number.isFinite(candidate.updatedAt) ? candidate.updatedAt : Date.now()

  if (!summary || lastCompressedMessageIndex < 0) return undefined

  return {
    summary,
    lastCompressedMessageIndex,
    updatedAt,
  }
}

function encodeMetaHeader(meta: ChatResponseMeta) {
  return encodeURIComponent(JSON.stringify(meta))
}

async function maybeCompressContext(params: {
  sessionMessages: SessionMessage[]
  compressedContext?: CompressedContext
  provider: AIProvider | null
}) {
  if (params.sessionMessages.length <= RAW_MESSAGE_WINDOW) return undefined

  const messagesToCompress = params.sessionMessages.slice(0, Math.max(params.sessionMessages.length - RAW_MESSAGE_WINDOW, 0))
  const lastMessage = messagesToCompress.at(-1)
  if (!lastMessage) return undefined

  return compressContext({
    existingSummary: params.compressedContext?.summary,
    lastCompressedMessageIndex: lastMessage.index,
    messagesToCompress: messagesToCompress.map((message) => ({
      role: message.role,
      content: message.content,
      personality: message.personality ? personalities[message.personality].name : undefined,
    })),
  }, params.provider)
}

function buildContextBlock(compressedContext?: CompressedContext) {
  if (!compressedContext?.summary) return ''

  return `Temporary in-session context:
${compressedContext.summary}
Use this only to maintain continuity in this anonymous session. Do not mention it explicitly unless useful.`
}

function buildSafetyInstruction(safetyRoute: SafetyRouteResult) {
  if (safetyRoute.level === 'urgent_safety') {
    return `For this response, use a safe, supportive Cotton or Angel-like tone regardless of the selected personality.
Do not use tough love.
Include one short, calm sentence encouraging the user to contact local emergency services or someone they trust if they may be in immediate danger.`
  }

  if (safetyRoute.level === 'elevated_distress') {
    return `For this response, soften the tone. Do not scold, shame, intensify pressure, or use harsh tough-love framing.`
  }

  return ''
}

function buildPromptMessages(params: {
  message: string
  finalPersona: PersonalityKey
  safetyRoute: SafetyRouteResult
  compressedContext?: CompressedContext
  sessionMessages: SessionMessage[]
}) {
  const contextBlock = buildContextBlock(params.compressedContext)
  const safetyInstruction = buildSafetyInstruction(params.safetyRoute)
  const recentMessages = params.sessionMessages
    .filter((message) => !params.compressedContext || message.index > params.compressedContext.lastCompressedMessageIndex)
    .slice(-RAW_MESSAGE_WINDOW)

  const promptHistory = recentMessages.filter((message, index) => {
    const isLast = index === recentMessages.length - 1
    return !(isLast && message.role === 'user' && message.content.trim() === params.message)
  })

  return [
    {
      role: 'system' as const,
      content: `${getPersonalityPrompt(params.finalPersona)}

${safetyInstruction}

${contextBlock}

Keep the response to one paragraph, about 4 to 6 sentences, and under ${RESPONSE_WORD_LIMIT} words. Do not use bullets, headings, numbered steps, or chat-like formatting.`,
    },
    ...promptHistory.map((message) => ({
      role: message.role,
      content:
        message.role === 'assistant' && message.personality
          ? `${personalities[message.personality].name}: ${message.content}`
          : message.content,
    })),
    {
      role: 'user' as const,
      content: params.message,
    },
  ]
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

  const message = typeof body.message === 'string' ? body.message.trim().slice(0, MAX_MESSAGE_CHARS) : ''
  const requestedPersona = normalizePersonalityKey(body.personality)
  const suggestedPersona = normalizePersonalityKey(body.suggestedPersona)
  const acceptedSuggestedPersona = body.acceptedSuggestedPersona === true && suggestedPersona ? suggestedPersona : null
  const sessionMessages = parseSessionMessages(body.messages)
  const compressedContext = parseCompressedContext(body.compressedContext)

  if (!message) {
    return NextResponse.json(
      { error: 'Write something first. Even one sentence.' },
      { status: 400, headers: jsonHeaders(id, rateLimit) },
    )
  }

  if (!requestedPersona) {
    return quietError(400, jsonHeaders(id, rateLimit))
  }

  const selectedPersona = acceptedSuggestedPersona ?? requestedPersona
  const isOpeningMessage = sessionMessages.filter((sessionMessage) => sessionMessage.role === 'user').length <= 1
  const personaSuggestion = isOpeningMessage ? routePersona(message) : undefined
  const nextCompressedContext = await maybeCompressContext({ sessionMessages, compressedContext, provider })
  const contextForPrompt = nextCompressedContext ?? compressedContext

  let safetyRoute: SafetyRouteResult

  try {
    safetyRoute = await routeSafety({
      message,
      selectedPersona: selectedPersona as PersonalityId,
    }, provider)
  } catch (error) {
    console.error('[vent.ai] api.chat.safety_routing_failed', { requestId: id, error })
    safetyRoute = {
      level: 'urgent_safety',
      shouldOverridePersona: true,
      saferPersona: 'cotton',
      userFacingNote: 'Switched to a gentler response for this one.',
      internalReason: 'Safety routing failed; defaulted to safer behavior.',
    }
  }

  const finalPersona = safetyRoute.shouldOverridePersona
    ? normalizePersonalityKey(safetyRoute.saferPersona) ?? 'cotton'
    : selectedPersona

  const headers = streamHeaders(id, rateLimit)
  headers.set(
    'X-Vent-Meta',
    encodeMetaHeader({
      requestedPersona,
      finalPersona,
      personaSuggestion,
      safetyNote: safetyRoute.userFacingNote,
      compressedContext: nextCompressedContext,
      contextCompressed: Boolean(nextCompressedContext),
    }),
  )

  if (!provider) {
    headers.set('X-AI-Provider', 'mock')
    headers.set('Server-Timing', `vent_prep;dur=${Math.round(performance.now() - requestStartedAt)}`)

    return new Response(
      streamText(mockResponse(finalPersona, safetyRoute.level), () => {
        console.info('[vent.ai] api.chat.completed', {
          requestId: id,
          personality: finalPersona,
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

    const completion = await provider.stream({
      temperature: safetyRoute.level === 'normal' ? 0.72 : 0.58,
      maxTokens: safetyRoute.level === 'urgent_safety' ? 220 : 280,
      messages: buildPromptMessages({
        message,
        finalPersona,
        safetyRoute,
        compressedContext: contextForPrompt,
        sessionMessages,
      }),
    })

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
            personality: finalPersona,
            provider: 'groq',
            serverTtftMs: firstTokenAt ? Math.round(firstTokenAt - requestStartedAt) : null,
            totalMs: Math.round(performance.now() - requestStartedAt),
          })
        } catch (error) {
          console.error('[vent.ai] api.chat.stream_failed', { requestId: id, personality: finalPersona, error })
          controller.error(error)
        }
      },
    })

    return new Response(stream, { headers })
  } catch (error) {
    console.error('[vent.ai] api.chat.groq_failed', { requestId: id, personality: finalPersona, error })
    return quietError(503, jsonHeaders(id, rateLimit))
  }
}
