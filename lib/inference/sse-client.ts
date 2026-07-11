'use client'

import type { InferenceEvent } from '@/lib/inference/types'

type InferenceEventHandlers = {
  onEvent: (event: InferenceEvent) => void
}

export function openInferenceEventStream(url: string, handlers: InferenceEventHandlers) {
  const source = new EventSource(url)
  let settled = false
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined
  let resolveDone: () => void
  let rejectDone: (error: Error) => void

  const done = new Promise<void>((resolve, reject) => {
    resolveDone = resolve
    rejectDone = reject
  })

  function finish(error?: Error) {
    if (settled) return
    settled = true
    if (reconnectTimer) clearTimeout(reconnectTimer)
    source.close()
    if (error) rejectDone(error)
    else resolveDone()
  }

  source.onopen = () => {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    reconnectTimer = undefined
  }

  source.onerror = () => {
    if (settled || reconnectTimer) return
    reconnectTimer = setTimeout(() => finish(new Error('Lost the connection. Check your network and try again.')), 15_000)
  }

  for (const type of ['reset', 'meta', 'token', 'complete', 'failed', 'cancelled'] as const) {
    source.addEventListener(type, (message) => {
      try {
        const event = {
          id: message.lastEventId,
          type,
          data: JSON.parse(message.data) as unknown,
        } as InferenceEvent
        handlers.onEvent(event)

        if (type === 'complete' || type === 'cancelled') finish()
        if (type === 'failed') finish(new Error((event as Extract<InferenceEvent, { type: 'failed' }>).data.message))
      } catch {
        finish(new Error('Received an invalid inference event.'))
      }
    })
  }

  return {
    done,
    close() {
      finish()
    },
  }
}
