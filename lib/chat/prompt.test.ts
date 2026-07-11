import { describe, expect, it } from 'vitest'
import { buildPromptMessages } from '@/lib/chat/prompt'

const normalSafety = {
  level: 'normal' as const,
  shouldOverridePersona: false,
  internalReason: 'No concern.',
}

describe('chat prompt construction', () => {
  it('uses bounded history without duplicating the current user message', () => {
    const messages = buildPromptMessages({
      message: 'Current thought',
      finalPersona: 'angel',
      safetyRoute: normalSafety,
      sessionMessages: [
        { index: 0, role: 'user', content: 'Earlier thought' },
        { index: 1, role: 'assistant', content: 'Earlier response', personality: 'cotton' },
        { index: 2, role: 'user', content: 'Current thought' },
      ],
    })

    expect(messages.filter((message) => message.content === 'Current thought')).toHaveLength(1)
    expect(messages).toContainEqual({ role: 'assistant', content: 'Cotton: Earlier response' })
    expect(messages.at(-1)).toEqual({ role: 'user', content: 'Current thought' })
  })

  it('replaces compressed raw turns with the temporary summary', () => {
    const messages = buildPromptMessages({
      message: 'Current thought',
      finalPersona: 'cotton',
      safetyRoute: normalSafety,
      compressedContext: {
        summary: 'The user is weighing a career decision.',
        lastCompressedMessageIndex: 1,
        updatedAt: 100,
      },
      sessionMessages: [
        { index: 0, role: 'user', content: 'Old private detail' },
        { index: 2, role: 'user', content: 'Current thought' },
      ],
    })

    expect(messages[0].content).toContain('The user is weighing a career decision.')
    expect(messages.some((message) => message.content.includes('Old private detail'))).toBe(false)
  })
})
