import { normalizePersonalityKey, type PersonalityKey } from '@/lib/personalities'

export const RAW_MESSAGE_WINDOW = 12
export const MAX_SESSION_MESSAGES = 48
export const MAX_MESSAGE_CHARS = 5000

export type ConversationMessage = {
  index: number
  role: 'user' | 'assistant'
  content: string
  personality?: PersonalityKey
}

export type CompressedContext = {
  summary: string
  lastCompressedMessageIndex: number
  updatedAt: number
}

export type EphemeralConversation = {
  messages: ConversationMessage[]
  compressedContext?: CompressedContext
}

export function parseConversationMessages(value: unknown): ConversationMessage[] {
  if (!Array.isArray(value)) return []

  return value
    .flatMap((item, arrayIndex): ConversationMessage[] => {
      if (!item || typeof item !== 'object') return []

      const candidate = item as Record<string, unknown>
      const role = candidate.role === 'user' || candidate.role === 'assistant' ? candidate.role : null
      const content = typeof candidate.content === 'string' ? candidate.content.trim().slice(0, MAX_MESSAGE_CHARS) : ''
      const personality = normalizePersonalityKey(candidate.personality)
      const index = typeof candidate.index === 'number' && Number.isSafeInteger(candidate.index) ? candidate.index : arrayIndex

      if (!role || !content) return []

      return [{ index, role, content, personality: personality ?? undefined }]
    })
    .sort((a, b) => a.index - b.index)
    .slice(-MAX_SESSION_MESSAGES)
}

export function parseCompressedContext(value: unknown): CompressedContext | undefined {
  if (!value || typeof value !== 'object') return undefined

  const candidate = value as Partial<CompressedContext>
  const summary = typeof candidate.summary === 'string' ? candidate.summary.trim().slice(0, 900) : ''
  const lastCompressedMessageIndex =
    typeof candidate.lastCompressedMessageIndex === 'number' && Number.isSafeInteger(candidate.lastCompressedMessageIndex)
      ? candidate.lastCompressedMessageIndex
      : -1
  const updatedAt = typeof candidate.updatedAt === 'number' && Number.isFinite(candidate.updatedAt) ? candidate.updatedAt : Date.now()

  if (!summary || lastCompressedMessageIndex < 0) return undefined

  return { summary, lastCompressedMessageIndex, updatedAt }
}

export function parseEphemeralConversation(messages: unknown, compressedContext: unknown): EphemeralConversation {
  return {
    messages: parseConversationMessages(messages),
    compressedContext: parseCompressedContext(compressedContext),
  }
}
