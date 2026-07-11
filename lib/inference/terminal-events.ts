import type { InferenceEvent } from '@/lib/inference/types'

export type RetryableTerminalEventType = Extract<
  InferenceEvent['type'],
  'failed' | 'cancelled' | 'timed_out' | 'expired'
>

export function shouldResetInferenceAttempt(type: InferenceEvent['type']): type is RetryableTerminalEventType {
  return type === 'failed' || type === 'cancelled' || type === 'timed_out' || type === 'expired'
}
