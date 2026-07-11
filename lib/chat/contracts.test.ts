import { describe, expect, it } from 'vitest'
import { parseChatCommand } from '@/lib/chat/contracts'

describe('chat command parsing', () => {
  it('preserves the requested persona unless a valid suggestion was accepted', () => {
    expect(parseChatCommand({
      message: 'Help me think this through',
      personality: 'aristotle',
      suggestedPersona: 'angel',
      acceptedSuggestedPersona: false,
    })).toMatchObject({
      ok: true,
      command: { requestedPersona: 'aristotle', selectedPersona: 'aristotle' },
    })

    expect(parseChatCommand({
      message: 'Help me think this through',
      personality: 'aristotle',
      suggestedPersona: 'angel',
      acceptedSuggestedPersona: true,
    })).toMatchObject({
      ok: true,
      command: { requestedPersona: 'aristotle', selectedPersona: 'angel' },
    })
  })

  it('returns explicit validation failures', () => {
    expect(parseChatCommand({ message: ' ', personality: 'cotton' })).toEqual({
      ok: false,
      reason: 'empty_message',
    })
    expect(parseChatCommand({ message: 'hello', personality: 'unknown' })).toEqual({
      ok: false,
      reason: 'invalid_personality',
    })
  })
})
