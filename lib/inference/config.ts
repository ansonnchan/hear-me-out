function positiveMilliseconds(name: string, fallback: number) {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

const maxExecutionMs = positiveMilliseconds('INFERENCE_MAX_EXECUTION_MS', 90_000)

/**
 * Worker mode needs a separate, long-running `npm run worker` process. Keep it
 * opt-in so adding Upstash for rate limiting does not accidentally leave chat
 * requests waiting in an unconsumed queue on a serverless deployment.
 */
export function isInferenceWorkerEnabled() {
  return process.env.INFERENCE_USE_WORKER === 'true'
}

export const INFERENCE_LIMITS = Object.freeze({
  maxQueuedMs: positiveMilliseconds('INFERENCE_MAX_QUEUE_MS', 60_000),
  maxExecutionMs,
  maxSseWaitMs: positiveMilliseconds('INFERENCE_MAX_SSE_WAIT_MS', 120_000),
  maxStallMs: positiveMilliseconds('INFERENCE_MAX_STALL_MS', 30_000),
  workerLeaseMs: Math.max(
    positiveMilliseconds('INFERENCE_WORKER_LEASE_MS', 120_000),
    maxExecutionMs + 5_000,
  ),
})

export type InferenceLimits = typeof INFERENCE_LIMITS
