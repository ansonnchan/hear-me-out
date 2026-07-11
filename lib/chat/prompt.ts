import type { AIMessage } from '@/lib/ai/provider'
import type { SafetyRouteResult } from '@/lib/ai/safety-router'
import { RAW_MESSAGE_WINDOW, type CompressedContext, type ConversationMessage } from '@/lib/conversation/domain'
import { getPersonalityPrompt, personalities, type PersonalityKey } from '@/lib/personalities'

const RESPONSE_WORD_LIMIT = 160

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
    return 'For this response, soften the tone. Do not scold, shame, intensify pressure, or use harsh tough-love framing.'
  }

  return ''
}

export function buildPromptMessages(params: {
  message: string
  finalPersona: PersonalityKey
  safetyRoute: SafetyRouteResult
  compressedContext?: CompressedContext
  sessionMessages: ConversationMessage[]
}): AIMessage[] {
  const recentMessages = params.sessionMessages
    .filter((message) => !params.compressedContext || message.index > params.compressedContext.lastCompressedMessageIndex)
    .slice(-RAW_MESSAGE_WINDOW)
  const promptHistory = recentMessages.filter((message, index) => {
    const isLast = index === recentMessages.length - 1
    return !(isLast && message.role === 'user' && message.content.trim() === params.message)
  })

  return [
    {
      role: 'system',
      content: `${getPersonalityPrompt(params.finalPersona)}

${buildSafetyInstruction(params.safetyRoute)}

${buildContextBlock(params.compressedContext)}

Keep the response to one paragraph, about 4 to 6 sentences, and under ${RESPONSE_WORD_LIMIT} words. Do not use bullets, headings, numbered steps, or chat-like formatting.`,
    },
    ...promptHistory.map((message): AIMessage => ({
      role: message.role,
      content:
        message.role === 'assistant' && message.personality
          ? `${personalities[message.personality].name}: ${message.content}`
          : message.content,
    })),
    { role: 'user', content: params.message },
  ]
}
