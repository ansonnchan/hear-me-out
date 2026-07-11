import type { PersonaRouteResult } from '@/lib/ai/persona-router'
import type { ChatCommand } from '@/lib/chat/contracts'
import type { CompressedContext } from '@/lib/conversation/domain'
import type { PersonalityKey } from '@/lib/personalities'

export const INFERENCE_JOB_TTL_SECONDS = 15 * 60
export const INFERENCE_WORKER_LEASE_MS = 2 * 60 * 1000
export const MAX_INFERENCE_ATTEMPTS = 2

export type InferenceJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'

export type InferenceJobPayload = {
  version: 1
  requestId: string
  command: ChatCommand
}

export type InferenceJob = {
  id: string
  requestId: string
  status: InferenceJobStatus
  payload: InferenceJobPayload
  attempt: number
  createdAt: number
  updatedAt: number
  error?: string
}

export type InferenceResponseMeta = {
  requestedPersona: PersonalityKey
  finalPersona: PersonalityKey
  personaSuggestion?: PersonaRouteResult
  safetyNote?: string
  compressedContext?: CompressedContext
  contextCompressed: boolean
}

export type InferenceEvent =
  | { id: string; type: 'reset'; data: { attempt: number } }
  | { id: string; type: 'meta'; data: InferenceResponseMeta }
  | { id: string; type: 'token'; data: { text: string } }
  | { id: string; type: 'complete'; data: { completedAt: number } }
  | { id: string; type: 'failed'; data: { message: string } }
  | { id: string; type: 'cancelled'; data: { cancelledAt: number } }

export type PublishableInferenceEvent = Extract<InferenceEvent, { type: 'reset' | 'meta' | 'token' }>

export type ClaimedInferenceJob = {
  queueEntryId: string
  job: InferenceJob
  reclaimed: boolean
}
