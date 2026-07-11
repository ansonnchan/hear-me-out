import type { AIProvider } from '@/lib/ai/provider'
import { prepareChat } from '@/lib/chat/application-service'
import { mockResponse, streamMockResponse } from '@/lib/chat/mock-response'
import { INFERENCE_LIMITS, type InferenceLimits } from '@/lib/inference/config'
import type { InferenceJobStore } from '@/lib/inference/job-store'
import type { ClaimedInferenceJob, InferenceResponseMeta } from '@/lib/inference/types'

export type WorkerLogger = Pick<Console, 'info' | 'error'>

export async function processInferenceJob(params: {
  claim: ClaimedInferenceJob
  store: InferenceJobStore
  provider: AIProvider | null
  logger?: WorkerLogger
  limits?: InferenceLimits
}) {
  const { claim, store, provider, logger = console, limits = INFERENCE_LIMITS } = params
  const { job } = claim
  const startedAt = performance.now()

  if (!claim.reclaimed && Date.now() - job.createdAt >= limits.maxQueuedMs) {
    const timedOut = await store.timeout(job.id, 'queued', 'queue_deadline')
    if (timedOut) {
      logger.error('[vent.ai] worker.job_timed_out', {
        jobId: job.id,
        requestId: job.requestId,
        reason: 'queue_deadline',
      })
    }
    await store.acknowledge(claim.queueEntryId)
    return
  }

  const attempt = await store.markRunning(job.id)
  if (!attempt) {
    logger.info('[vent.ai] worker.job_skipped', {
      jobId: job.id,
      requestId: job.requestId,
      status: await store.getStatus(job.id),
    })
    await store.acknowledge(claim.queueEntryId)
    return
  }

  const controller = new AbortController()
  let executionDeadlineExceeded = false
  const executionDeadline = setTimeout(() => {
    executionDeadlineExceeded = true
    controller.abort(new DOMException('Inference execution deadline exceeded.', 'TimeoutError'))
  }, limits.maxExecutionMs)
  const cancellationWatcher = setInterval(() => {
    void store.getStatus(job.id).then((status) => {
      if (status === 'cancelled' || status === 'timed_out') controller.abort()
    }).catch((error) => {
      logger.error('[vent.ai] worker.cancellation_check_failed', { jobId: job.id, requestId: job.requestId, error })
    })
  }, 250)

  try {
    logger.info('[vent.ai] worker.job_started', {
      jobId: job.id,
      requestId: job.requestId,
      attempt,
      reclaimed: claim.reclaimed,
    })
    if (claim.reclaimed) {
      await store.publish(job.id, { id: '', type: 'reset', data: { attempt } })
    }
    const prepared = await prepareChat(job.payload.command, provider, controller.signal)
    const statusAfterPreparation = await store.getStatus(job.id)
    if (statusAfterPreparation === 'cancelled' || statusAfterPreparation === 'timed_out') {
      throw controller.signal.reason ?? new DOMException('Inference stopped.', 'AbortError')
    }

    const metadata: InferenceResponseMeta = {
      requestedPersona: prepared.requestedPersona,
      finalPersona: prepared.finalPersona,
      personaSuggestion: prepared.personaSuggestion,
      safetyNote: prepared.safetyRoute.userFacingNote,
      compressedContext: prepared.nextCompressedContext,
      contextCompressed: Boolean(prepared.nextCompressedContext),
    }
    await store.publish(job.id, { id: '', type: 'meta', data: metadata })

    const completion = provider
      ? await provider.stream(prepared.completionRequest, controller.signal)
      : streamMockResponse(mockResponse(prepared.finalPersona, prepared.safetyRoute.level))

    for await (const text of completion) {
      const status = await store.getStatus(job.id)
      if (controller.signal.aborted || status === 'cancelled' || status === 'timed_out') {
        controller.abort()
        throw controller.signal.reason ?? new DOMException('Inference stopped.', 'AbortError')
      }
      await store.publish(job.id, { id: '', type: 'token', data: { text } })
    }

    if (executionDeadlineExceeded) {
      await store.timeout(job.id, 'running', 'execution_deadline')
      return
    }
    const finalStatus = await store.getStatus(job.id)
    if (finalStatus === 'cancelled' || finalStatus === 'timed_out') {
      throw controller.signal.reason ?? new DOMException('Inference stopped.', 'AbortError')
    }
    const completed = await store.complete(job.id)
    if (completed) {
      logger.info('[vent.ai] worker.job_completed', {
        jobId: job.id,
        requestId: job.requestId,
        provider: provider?.name ?? 'mock',
        totalMs: Math.round(performance.now() - startedAt),
      })
    }
  } catch (error) {
    const status = await store.getStatus(job.id)
    if (executionDeadlineExceeded && status === 'running') {
      await store.timeout(job.id, 'running', 'execution_deadline')
      logger.error('[vent.ai] worker.job_timed_out', {
        jobId: job.id,
        requestId: job.requestId,
        reason: 'execution_deadline',
      })
    } else if (status === 'cancelled') {
      logger.info('[vent.ai] worker.job_cancelled', { jobId: job.id, requestId: job.requestId })
    } else if (status === 'timed_out') {
      logger.error('[vent.ai] worker.job_timed_out', {
        jobId: job.id,
        requestId: job.requestId,
        reason: 'external_deadline',
      })
    } else {
      const message = 'Something went quiet. Try again in a moment.'
      await store.fail(job.id, message)
      logger.error('[vent.ai] worker.job_failed', { jobId: job.id, requestId: job.requestId, error })
    }
  } finally {
    clearTimeout(executionDeadline)
    clearInterval(cancellationWatcher)
    await store.acknowledge(claim.queueEntryId)
  }
}
