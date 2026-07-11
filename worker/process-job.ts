import type { AIProvider } from '@/lib/ai/provider'
import { prepareChat } from '@/lib/chat/application-service'
import { mockResponse, streamMockResponse } from '@/lib/chat/mock-response'
import type { InferenceJobStore } from '@/lib/inference/job-store'
import type { ClaimedInferenceJob, InferenceResponseMeta } from '@/lib/inference/types'

export type WorkerLogger = Pick<Console, 'info' | 'error'>

export async function processInferenceJob(params: {
  claim: ClaimedInferenceJob
  store: InferenceJobStore
  provider: AIProvider | null
  logger?: WorkerLogger
}) {
  const { claim, store, provider, logger = console } = params
  const { job } = claim
  const startedAt = performance.now()

  if (!await store.markRunning(job.id)) {
    await store.acknowledge(claim.queueEntryId)
    return
  }

  const controller = new AbortController()
  const cancellationWatcher = setInterval(() => {
    void store.isCancelled(job.id).then((cancelled) => {
      if (cancelled) controller.abort()
    }).catch((error) => {
      logger.error('[vent.ai] worker.cancellation_check_failed', { jobId: job.id, requestId: job.requestId, error })
    })
  }, 250)

  try {
    logger.info('[vent.ai] worker.job_started', { jobId: job.id, requestId: job.requestId })
    const prepared = await prepareChat(job.payload.command, provider)
    if (await store.isCancelled(job.id)) return

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
      if (controller.signal.aborted || await store.isCancelled(job.id)) {
        controller.abort()
        return
      }
      await store.publish(job.id, { id: '', type: 'token', data: { text } })
    }

    if (await store.isCancelled(job.id)) return
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
    if (!controller.signal.aborted && !await store.isCancelled(job.id)) {
      const message = 'Something went quiet. Try again in a moment.'
      await store.fail(job.id, message)
      logger.error('[vent.ai] worker.job_failed', { jobId: job.id, requestId: job.requestId, error })
    }
  } finally {
    clearInterval(cancellationWatcher)
    await store.acknowledge(claim.queueEntryId)
  }
}
