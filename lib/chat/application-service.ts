import { compressContext } from '@/lib/ai/context-compressor'
import { routePersona, type PersonaRouteResult, type PersonalityId } from '@/lib/ai/persona-router'
import type { AICompletionRequest, AIProvider } from '@/lib/ai/provider'
import { routeSafety, type SafetyRouteResult } from '@/lib/ai/safety-router'
import type { ChatCommand } from '@/lib/chat/contracts'
import { buildPromptMessages } from '@/lib/chat/prompt'
import { RAW_MESSAGE_WINDOW, type CompressedContext } from '@/lib/conversation/domain'
import { normalizePersonalityKey, personalities, type PersonalityKey } from '@/lib/personalities'

export type PreparedChat = {
  requestedPersona: PersonalityKey
  finalPersona: PersonalityKey
  personaSuggestion?: PersonaRouteResult
  safetyRoute: SafetyRouteResult
  nextCompressedContext?: CompressedContext
  completionRequest: AICompletionRequest
}

async function maybeCompressContext(command: ChatCommand, provider: AIProvider | null) {
  const { messages, compressedContext } = command.conversation
  if (messages.length <= RAW_MESSAGE_WINDOW) return undefined

  const messagesToCompress = messages.slice(0, Math.max(messages.length - RAW_MESSAGE_WINDOW, 0))
  const lastMessage = messagesToCompress.at(-1)
  if (!lastMessage) return undefined

  return compressContext({
    existingSummary: compressedContext?.summary,
    lastCompressedMessageIndex: lastMessage.index,
    messagesToCompress: messagesToCompress.map((message) => ({
      role: message.role,
      content: message.content,
      personality: message.personality ? personalities[message.personality].name : undefined,
    })),
  }, provider)
}

export async function prepareChat(command: ChatCommand, provider: AIProvider | null): Promise<PreparedChat> {
  const { messages, compressedContext } = command.conversation
  const isOpeningMessage = messages.filter((message) => message.role === 'user').length <= 1
  const personaSuggestion = isOpeningMessage ? routePersona(command.message) : undefined
  const nextCompressedContext = await maybeCompressContext(command, provider)
  const contextForPrompt = nextCompressedContext ?? compressedContext
  const safetyRoute = await routeSafety({
    message: command.message,
    selectedPersona: command.selectedPersona as PersonalityId,
  }, provider)
  const finalPersona = safetyRoute.shouldOverridePersona
    ? normalizePersonalityKey(safetyRoute.saferPersona) ?? 'cotton'
    : command.selectedPersona

  return {
    requestedPersona: command.requestedPersona,
    finalPersona,
    personaSuggestion,
    safetyRoute,
    nextCompressedContext,
    completionRequest: {
      temperature: safetyRoute.level === 'normal' ? 0.72 : 0.58,
      maxTokens: safetyRoute.level === 'urgent_safety' ? 220 : 280,
      messages: buildPromptMessages({
        message: command.message,
        finalPersona,
        safetyRoute,
        compressedContext: contextForPrompt,
        sessionMessages: messages,
      }),
    },
  }
}
