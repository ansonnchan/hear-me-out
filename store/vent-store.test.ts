import { beforeEach, describe, expect, it } from 'vitest'
import { useVentStore } from '@/store/vent-store'

describe('vent session transcript', () => {
  beforeEach(() => {
    useVentStore.getState().resetSession()
  })

  it('keeps the visible transcript when older context is compressed for inference', () => {
    const store = useVentStore.getState()
    store.addSessionMessage({ role: 'user', content: 'I had a difficult day.' })
    store.addSessionMessage({ role: 'assistant', content: 'That sounds like a lot to carry.', personality: 'cotton' })
    store.addSessionMessage({ role: 'user', content: 'I want to talk about it.' })

    useVentStore.getState().applyCompressedContext({
      summary: 'The user had a difficult day.',
      lastCompressedMessageIndex: 1,
      updatedAt: Date.now(),
    })

    expect(useVentStore.getState().sessionMessages).toEqual([
      expect.objectContaining({ index: 2, content: 'I want to talk about it.' }),
    ])
    expect(useVentStore.getState().transcriptMessages).toEqual([
      expect.objectContaining({ index: 0, content: 'I had a difficult day.' }),
      expect.objectContaining({ index: 1, content: 'That sounds like a lot to carry.' }),
      expect.objectContaining({ index: 2, content: 'I want to talk about it.' }),
    ])
  })
})
