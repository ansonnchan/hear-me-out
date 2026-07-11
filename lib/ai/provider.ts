export type AIMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type AICompletionRequest = {
  messages: AIMessage[]
  temperature: number
  maxTokens: number
}

export interface AIProvider {
  readonly name: string
  complete(request: AICompletionRequest): Promise<string>
  stream(request: AICompletionRequest, signal?: AbortSignal): Promise<AsyncIterable<string>>
}
