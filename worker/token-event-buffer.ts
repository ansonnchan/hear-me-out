const DEFAULT_MAX_CHARACTERS = 96
const DEFAULT_MAX_DELAY_MS = 40

export class TokenEventBuffer {
  private content = ''
  private hasPublished = false
  private lastPublishedAt: number

  constructor(
    private readonly publish: (text: string) => Promise<unknown>,
    private readonly options: {
      maxCharacters?: number
      maxDelayMs?: number
      now?: () => number
    } = {},
  ) {
    this.lastPublishedAt = this.now()
  }

  async append(fragment: string) {
    if (!fragment) return
    this.content += fragment

    const reachedSize = this.content.length >= (this.options.maxCharacters ?? DEFAULT_MAX_CHARACTERS)
    const reachedDelay = this.now() - this.lastPublishedAt >= (this.options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS)
    if (!this.hasPublished || reachedSize || reachedDelay) await this.flush()
  }

  async flush() {
    if (!this.content) return
    const text = this.content
    this.content = ''
    try {
      await this.publish(text)
    } catch (error) {
      this.content = text + this.content
      throw error
    }
    this.hasPublished = true
    this.lastPublishedAt = this.now()
  }

  private now() {
    return (this.options.now ?? (() => performance.now()))()
  }
}
