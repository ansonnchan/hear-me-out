import { MAX_MESSAGE_CHARS, parseEphemeralConversation, type EphemeralConversation } from '@/lib/conversation/domain'
import { normalizePersonalityKey, type PersonalityKey } from '@/lib/personalities'

export interface ChatRequestBody {
  message?: unknown
  personality?: unknown
  messages?: unknown
  compressedContext?: unknown
  acceptedSuggestedPersona?: unknown
  suggestedPersona?: unknown
}

export type ChatCommand = {
  message: string
  requestedPersona: PersonalityKey
  selectedPersona: PersonalityKey
  conversation: EphemeralConversation
}

export type ChatCommandParseResult =
  | { ok: true; command: ChatCommand }
  | { ok: false; reason: 'empty_message' | 'invalid_personality' }

export function parseChatCommand(body: ChatRequestBody): ChatCommandParseResult {
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, MAX_MESSAGE_CHARS) : ''
  const requestedPersona = normalizePersonalityKey(body.personality)

  if (!message) return { ok: false, reason: 'empty_message' }
  if (!requestedPersona) return { ok: false, reason: 'invalid_personality' }

  const suggestedPersona = normalizePersonalityKey(body.suggestedPersona)
  const acceptedSuggestedPersona = body.acceptedSuggestedPersona === true ? suggestedPersona : null

  return {
    ok: true,
    command: {
      message,
      requestedPersona,
      selectedPersona: acceptedSuggestedPersona ?? requestedPersona,
      conversation: parseEphemeralConversation(body.messages, body.compressedContext),
    },
  }
}
