import type {
  ClaimedInferenceJob,
  InferenceEvent,
  InferenceJob,
  InferenceJobPayload,
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
  markRunning(jobId: string): Promise<boolean>
  publish(jobId: string, event: PublishableInferenceEvent): Promise<string>
  complete(jobId: string): Promise<boolean>
  fail(jobId: string, message: string): Promise<boolean>
  cancel(jobId: string): Promise<boolean>
  isCancelled(jobId: string): Promise<boolean>
  readEvents(jobId: string, afterId: string, count?: number): Promise<InferenceEvent[]>
}
