import type { AIProvider } from '@/lib/ai/provider'
import type { CompressedContext } from '@/lib/conversation/domain'

type CompressibleMessage = {
  role: 'user' | 'assistant'
  content: string
  personality?: string
}

function sanitizeSummary(summary: string) {
  return summary.replace(/\s+/g, ' ').trim().slice(0, 900)
}

function formatMessageForCompression(message: CompressibleMessage) {
  const speaker = message.role === 'assistant' && message.personality ? `assistant (${message.personality})` : message.role
  return `${speaker}: ${message.content.replace(/\s+/g, ' ').trim().slice(0, 1200)}`
}

function localFallbackSummary(existingSummary: string | undefined, messages: CompressibleMessage[]) {
  const userSnippets = messages
    .filter((message) => message.role === 'user')
    .map((message) => message.content.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(-3)
    .map((content) => content.slice(0, 120))

  const assistantStyles = Array.from(
    new Set(messages.map((message) => message.personality).filter((personality): personality is string => Boolean(personality))),
  ).slice(-3)

  const parts = [
    existingSummary,
    userSnippets.length ? `Earlier notes touched on: ${userSnippets.join('; ')}.` : undefined,
    assistantStyles.length ? `Helpful lenses used recently: ${assistantStyles.join(', ')}.` : undefined,
  ].filter(Boolean)

  return sanitizeSummary(parts.join(' '))
}

export async function compressContext(params: {
  existingSummary?: string
  messagesToCompress: CompressibleMessage[]
  lastCompressedMessageIndex?: number
}, provider: AIProvider | null): Promise<CompressedContext> {
  const lastCompressedMessageIndex =
    params.lastCompressedMessageIndex ?? Math.max(params.messagesToCompress.length - 1, 0)

  if (!params.messagesToCompress.length) {
    return {
      summary: sanitizeSummary(params.existingSummary ?? ''),
      lastCompressedMessageIndex,
      updatedAt: Date.now(),
    }
  }

  if (!provider) {
    return {
      summary: localFallbackSummary(params.existingSummary, params.messagesToCompress),
      lastCompressedMessageIndex,
      updatedAt: Date.now(),
    }
  }

  try {
    const summary = sanitizeSummary(await provider.complete({
      temperature: 0.2,
      maxTokens: 180,
      messages: [
        {
          role: 'system',
          content: `Summarize the session so far in max 120 words.
Do not diagnose.
Do not use clinical language.
Capture recurring themes, unresolved questions, user preferences, and important context.
Keep it useful for future responses.
Do not include unnecessary sensitive detail.
Use neutral language.`,
        },
        {
          role: 'user',
          content: `${params.existingSummary ? `Existing temporary summary:\n${params.existingSummary}\n\n` : ''}Older turns to compress:\n${params.messagesToCompress
            .map(formatMessageForCompression)
            .join('\n')}`,
        },
      ],
    }))

    return {
      summary: summary || localFallbackSummary(params.existingSummary, params.messagesToCompress),
      lastCompressedMessageIndex,
      updatedAt: Date.now(),
    }
  } catch (error) {
    console.error('Context compression failed', error)

    return {
      summary: localFallbackSummary(params.existingSummary, params.messagesToCompress),
      lastCompressedMessageIndex,
      updatedAt: Date.now(),
    }
  }
}
