import { hostname } from 'node:os'
import type { AIProvider } from '@/lib/ai/provider'
import { abortableDelay } from '@/lib/inference/abortable-delay'
import type { InferenceJobStore } from '@/lib/inference/job-store'
import { processInferenceJob, type WorkerLogger } from '@/worker/process-job'

export async function runInferenceWorker(params: {
  store: InferenceJobStore
  provider: AIProvider | null
  signal: AbortSignal
  consumerName?: string
  pollIntervalMs?: number
  logger?: WorkerLogger
}) {
  const {
    store,
    provider,
    signal,
    consumerName = `${hostname()}-${process.pid}`,
    pollIntervalMs = 500,
    logger = console,
  } = params

  await store.ensureConsumerGroup()
  logger.info('[vent.ai] worker.ready', { consumerName, provider: provider?.name ?? 'mock' })

  while (!signal.aborted) {
    try {
      const claim = await store.claimNext(consumerName)
      if (claim) {
        logger.info('[vent.ai] worker.job_claimed', {
          jobId: claim.job.id,
          requestId: claim.job.requestId,
          queueEntryId: claim.queueEntryId,
          reclaimed: claim.reclaimed,
          previousAttempt: claim.job.attempt,
        })
        await processInferenceJob({ claim, store, provider, logger })
      } else {
        await abortableDelay(pollIntervalMs, signal)
      }
    } catch (error) {
      logger.error('[vent.ai] worker.poll_failed', { consumerName, error })
      await abortableDelay(pollIntervalMs, signal)
    }
  }

  logger.info('[vent.ai] worker.stopped', { consumerName })
}
