import Groq from 'groq-sdk'
import type { AICompletionRequest, AIProvider } from '@/lib/ai/provider'

const DEFAULT_MODEL = 'llama-3.3-70b-versatile'

export class GroqAIProvider implements AIProvider {
  readonly name = 'groq'

  constructor(
    private readonly client: Groq,
    private readonly model = DEFAULT_MODEL,
  ) {}

  async complete(request: AICompletionRequest, signal?: AbortSignal) {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      messages: request.messages,
    }, { signal })

    return completion.choices[0]?.message?.content ?? ''
  }

  async stream(request: AICompletionRequest, signal?: AbortSignal): Promise<AsyncIterable<string>> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      stream: true,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      messages: request.messages,
    }, { signal })

    return {
      async *[Symbol.asyncIterator]() {
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content ?? ''
          if (content) yield content
        }
      },
    }
  }
}
