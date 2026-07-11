import { describe, expect, it } from 'vitest'
import type { AICompletionRequest, AIProvider } from '@/lib/ai/provider'
import { prepareChat } from '@/lib/chat/application-service'
import type { ChatCommand } from '@/lib/chat/contracts'

class FakeProvider implements AIProvider {
  readonly name = 'fake'
  readonly requests: AICompletionRequest[] = []

  async complete(request: AICompletionRequest) {
    this.requests.push(request)
    const systemPrompt = request.messages[0]?.content ?? ''

    if (systemPrompt.includes('Summarize the session')) return 'A bounded summary of older turns.'
    return JSON.stringify({ level: 'normal', internalReason: 'No concern.', saferPersona: null })
  }

  async stream() {
    return {
      async *[Symbol.asyncIterator]() {
        yield 'unused'
      },
    }
  }
}

describe('chat application service', () => {
  it('coordinates compression and safety through the provider boundary', async () => {
    const provider = new FakeProvider()
    const command: ChatCommand = {
      message: 'Current thought',
      requestedPersona: 'aristotle',
      selectedPersona: 'aristotle',
      conversation: {
        messages: Array.from({ length: 14 }, (_, index) => ({
          index,
          role: index % 2 === 0 ? 'user' as const : 'assistant' as const,
          content: index === 13 ? 'Current thought' : `Turn ${index}`,
        })),
      },
    }

    const prepared = await prepareChat(command, provider)

    expect(provider.requests).toHaveLength(2)
    expect(prepared.nextCompressedContext).toMatchObject({
      summary: 'A bounded summary of older turns.',
      lastCompressedMessageIndex: 1,
    })
    expect(prepared.finalPersona).toBe('aristotle')
    expect(prepared.completionRequest.messages.at(-1)).toEqual({ role: 'user', content: 'Current thought' })
  })
})
