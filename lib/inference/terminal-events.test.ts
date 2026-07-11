import { describe, expect, it } from 'vitest'
import { shouldResetInferenceAttempt } from '@/lib/inference/terminal-events'

describe('inference attempt idempotency', () => {
  it.each(['failed', 'cancelled', 'timed_out', 'expired'] as const)(
    'clears the attempt after %s',
    (type) => expect(shouldResetInferenceAttempt(type)).toBe(true),
  )

  it.each(['reset', 'meta', 'token', 'complete'] as const)(
    'preserves the attempt during %s delivery',
    (type) => expect(shouldResetInferenceAttempt(type)).toBe(false),
  )
})
