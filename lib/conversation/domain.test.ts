import { describe, expect, it } from 'vitest'
import {
  MAX_MESSAGE_CHARS,
  MAX_SESSION_MESSAGES,
  parseCompressedContext,
  parseConversationMessages,
} from '@/lib/conversation/domain'

describe('ephemeral conversation parsing', () => {
  it('normalizes, orders, and bounds client-provided messages', () => {
    const input = Array.from({ length: MAX_SESSION_MESSAGES + 5 }, (_, index) => ({
      index: MAX_SESSION_MESSAGES + 5 - index,
      role: index % 2 ? 'assistant' : 'user',
      content: ` message ${index} `,
      personality: index % 2 ? 'angel' : undefined,
    }))

    const messages = parseConversationMessages(input)

    expect(messages).toHaveLength(MAX_SESSION_MESSAGES)
    expect(messages[0].index).toBe(6)
    expect(messages.at(-1)?.index).toBe(MAX_SESSION_MESSAGES + 5)
    expect(messages.every((message) => message.content === message.content.trim())).toBe(true)
  })

  it('rejects invalid messages and limits individual content', () => {
    const messages = parseConversationMessages([
      null,
      { role: 'system', content: 'not allowed' },
      { role: 'user', content: '   ' },
      { role: 'user', content: 'x'.repeat(MAX_MESSAGE_CHARS + 10) },
    ])

    expect(messages).toHaveLength(1)
    expect(messages[0].content).toHaveLength(MAX_MESSAGE_CHARS)
  })

  it('accepts only usable compressed context', () => {
    expect(parseCompressedContext({ summary: '', lastCompressedMessageIndex: 2 })).toBeUndefined()
    expect(parseCompressedContext({ summary: 'Earlier context', lastCompressedMessageIndex: -1 })).toBeUndefined()
    expect(parseCompressedContext({
      summary: ' Earlier context ',
      lastCompressedMessageIndex: 2,
      updatedAt: 100,
    })).toEqual({
      summary: 'Earlier context',
      lastCompressedMessageIndex: 2,
      updatedAt: 100,
    })
  })
})
