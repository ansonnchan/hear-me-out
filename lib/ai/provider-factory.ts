import Groq from 'groq-sdk'
import { GroqAIProvider } from '@/lib/ai/groq-provider'
import type { AIProvider } from '@/lib/ai/provider'

let provider: AIProvider | null | undefined

export function getAIProvider(): AIProvider | null {
  if (provider !== undefined) return provider

  provider = process.env.GROQ_API_KEY
    ? new GroqAIProvider(
        new Groq({
          apiKey: process.env.GROQ_API_KEY,
        }),
      )
    : null

  return provider
}
