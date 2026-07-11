import { afterEach, describe, expect, it, vi } from 'vitest'
import { openInferenceEventStream } from '@/lib/inference/sse-client'
import type { InferenceEvent } from '@/lib/inference/types'

class FakeEventSource {
  static current: FakeEventSource
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  closed = false
  private readonly listeners = new Map<string, (event: MessageEvent<string>) => void>()

  constructor(readonly url: string) {
    FakeEventSource.current = this
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    this.listeners.set(type, listener as (event: MessageEvent<string>) => void)
  }

  close() {
    this.closed = true
  }

  emit(type: string, data: object, lastEventId: string) {
    this.listeners.get(type)?.({ data: JSON.stringify(data), lastEventId } as MessageEvent<string>)
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('inference SSE client', () => {
  it('delivers ordered event IDs and closes on completion', async () => {
    vi.stubGlobal('EventSource', FakeEventSource)
    const events: InferenceEvent[] = []
    const stream = openInferenceEventStream('/events', { onEvent: (event) => events.push(event) })

    FakeEventSource.current.emit('token', { text: 'one' }, '1-0')
    FakeEventSource.current.emit('token', { text: ' two' }, '2-0')
    FakeEventSource.current.emit('complete', { completedAt: 3 }, '3-0')
    await stream.done

    expect(events.map((event) => event.id)).toEqual(['1-0', '2-0', '3-0'])
    expect(FakeEventSource.current.closed).toBe(true)
  })

  it('surfaces a terminal worker failure', async () => {
    vi.stubGlobal('EventSource', FakeEventSource)
    const stream = openInferenceEventStream('/events', { onEvent() {} })

    FakeEventSource.current.emit('failed', { message: 'Inference failed.' }, '4-0')

    await expect(stream.done).rejects.toThrow('Inference failed.')
    expect(FakeEventSource.current.closed).toBe(true)
  })

  it.each([
    ['cancelled', { cancelledAt: 4 }],
    ['timed_out', { message: 'Too slow.', reason: 'execution_deadline', timedOutAt: 4 }],
    ['expired', { message: 'Expired.', expiredAt: 4 }],
  ] as const)('surfaces the terminal %s event as retryable', async (type, data) => {
    vi.stubGlobal('EventSource', FakeEventSource)
    const stream = openInferenceEventStream('/events', { onEvent() {} })

    FakeEventSource.current.emit(type, data, '4-0')

    await expect(stream.done).rejects.toThrow()
    expect(FakeEventSource.current.closed).toBe(true)
  })
})
