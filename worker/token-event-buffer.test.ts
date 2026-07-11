import { describe, expect, it, vi } from 'vitest'
import { TokenEventBuffer } from '@/worker/token-event-buffer'

describe('TokenEventBuffer', () => {
  it('publishes the first fragment immediately and coalesces the remainder', async () => {
    const publish = vi.fn().mockResolvedValue(undefined)
    const buffer = new TokenEventBuffer(publish, { maxCharacters: 20, maxDelayMs: 1000 })

    await buffer.append('First')
    await buffer.append(' ')
    await buffer.append('response')
    await buffer.flush()

    expect(publish.mock.calls).toEqual([['First'], [' response']])
  })

  it('flushes when the size threshold is reached', async () => {
    const publish = vi.fn().mockResolvedValue(undefined)
    const buffer = new TokenEventBuffer(publish, { maxCharacters: 4, maxDelayMs: 1000 })

    await buffer.append('a')
    await buffer.append('bc')
    await buffer.append('de')

    expect(publish.mock.calls).toEqual([['a'], ['bcde']])
  })

  it('flushes when the short delay threshold is reached', async () => {
    let now = 0
    const publish = vi.fn().mockResolvedValue(undefined)
    const buffer = new TokenEventBuffer(publish, { maxCharacters: 100, maxDelayMs: 40, now: () => now })

    await buffer.append('a')
    now = 50
    await buffer.append('b')

    expect(publish.mock.calls).toEqual([['a'], ['b']])
  })
})
