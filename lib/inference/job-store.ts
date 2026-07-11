import type {
  ClaimedInferenceJob,
  InferenceEvent,
  InferenceJob,
  InferenceJobPayload,
  InferenceJobStatus,
  InferenceTimeoutReason,
  PublishableInferenceEvent,
} from '@/lib/inference/types'

export interface InferenceJobStore {
  enqueue(params: {
    jobId: string
    idempotencyKey: string
    payload: InferenceJobPayload
  }): Promise<{ jobId: string; created: boolean }>
  ensureConsumerGroup(): Promise<void>
  claimNext(consumerName: string): Promise<ClaimedInferenceJob | null>
  acknowledge(queueEntryId: string): Promise<void>
  getJob(jobId: string): Promise<InferenceJob | null>
  getStatus(jobId: string): Promise<InferenceJobStatus | null>
  markRunning(jobId: string): Promise<number | null>
  publish(jobId: string, event: PublishableInferenceEvent): Promise<string | null>
  complete(jobId: string): Promise<boolean>
  fail(jobId: string, message: string): Promise<boolean>
  timeout(jobId: string, expected: 'queued' | 'running', reason: InferenceTimeoutReason): Promise<boolean>
  cancel(jobId: string): Promise<boolean>
  readEvents(jobId: string, afterId: string, count?: number): Promise<InferenceEvent[]>
}
