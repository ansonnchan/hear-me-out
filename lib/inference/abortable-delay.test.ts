import { describe, expect, it, vi } from 'vitest'
import { abortableDelay } from '@/lib/inference/abortable-delay'

describe('abortableDelay', () => {
  it('removes its abort listener after a normal polling delay', async () => {
    const controller = new AbortController()
    const add = vi.spyOn(controller.signal, 'addEventListener')
    const remove = vi.spyOn(controller.signal, 'removeEventListener')

    for (let index = 0; index < 15; index += 1) {
      await abortableDelay(1, controller.signal)
    }

    expect(add).toHaveBeenCalledTimes(15)
    expect(remove).toHaveBeenCalledTimes(15)
  })

  it('cleans up and resolves when aborted', async () => {
    const controller = new AbortController()
    const remove = vi.spyOn(controller.signal, 'removeEventListener')
    const waiting = abortableDelay(60_000, controller.signal)

    controller.abort()

    await expect(waiting).resolves.toBeUndefined()
    expect(remove).toHaveBeenCalledOnce()
  })
})
