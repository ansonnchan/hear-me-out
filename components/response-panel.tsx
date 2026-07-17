'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import type { CompressedContext } from '@/lib/conversation/domain'
import type { PersonaRouteResult } from '@/lib/ai/persona-router'
import { recordClientMetric } from '@/lib/client-metrics'
import { openInferenceEventStream } from '@/lib/inference/sse-client'
import { shouldResetInferenceAttempt } from '@/lib/inference/terminal-events'
import { personalityPortraits } from '@/lib/personality-assets'
import { normalizePersonalityKey, personalities, type PersonalityKey } from '@/lib/personalities'
import { cn } from '@/lib/utils'
import { useVentStore } from '@/store/vent-store'

type StatusMap = Partial<Record<PersonalityKey, 'idle' | 'loading' | 'complete' | 'error'>>
type ErrorMap = Partial<Record<PersonalityKey, string>>

type QueuedChatResponse = {
  jobId: string
  eventsUrl: string
}

type ChatResponseMeta = {
  requestedPersona?: PersonalityKey
  finalPersona?: PersonalityKey
  personaSuggestion?: PersonaRouteResult
  safetyNote?: string
  compressedContext?: CompressedContext
  contextCompressed?: boolean
}

const cooldownMessages: Record<PersonalityKey, string> = {
  cotton: 'Take a breath. Try again in a moment.',
  aristotle: 'Pause for a moment. Clear thinking needs a little space.',
  'venerable-ming': 'Let the water settle. Try again in a moment.',
  angel: 'Take a breath. I am still here.',
  'auntie-zhang': 'Slow down. One clean attempt at a time.',
}

interface ResponsePanelProps {
  originalText: string
  autoGenerateKey?: number
  acceptedSuggestedPersona?: PersonalityKey | null
  onPersonaSuggestion?: (suggestion: PersonaRouteResult) => void
  onGeneratingChange?: (isGenerating: boolean) => void
  onClearPrompt?: () => void
  className?: string
}

function messageForStatus(status: number) {
  if (status === 400) return 'Write something first. Even one sentence.'
  if (status === 429) return 'Take a breath. Try again in a moment.'
  return 'Something went quiet. Try again in a moment.'
}

function parseCompressedContext(value: unknown): CompressedContext | undefined {
  if (!value || typeof value !== 'object') return undefined

  const candidate = value as Partial<CompressedContext>
  const summary = typeof candidate.summary === 'string' ? candidate.summary : ''
  const lastCompressedMessageIndex =
    typeof candidate.lastCompressedMessageIndex === 'number' && Number.isSafeInteger(candidate.lastCompressedMessageIndex)
      ? candidate.lastCompressedMessageIndex
      : -1
  const updatedAt = typeof candidate.updatedAt === 'number' && Number.isFinite(candidate.updatedAt) ? candidate.updatedAt : Date.now()

  if (!summary || lastCompressedMessageIndex < 0) return undefined

  return {
    summary,
    lastCompressedMessageIndex,
    updatedAt,
  }
}

function parsePersonaSuggestion(value: unknown): PersonaRouteResult | undefined {
  if (!value || typeof value !== 'object') return undefined

  const candidate = value as Partial<PersonaRouteResult>
  const suggestedPersona = normalizePersonalityKey(candidate.suggestedPersona)

  if (!suggestedPersona || typeof candidate.reason !== 'string' || typeof candidate.confidence !== 'number') {
    return undefined
  }

  return {
    suggestedPersona,
    confidence: candidate.confidence,
    reason: candidate.reason,
    alternatives: Array.isArray(candidate.alternatives)
      ? candidate.alternatives.flatMap((alternative) => {
          if (!alternative || typeof alternative !== 'object') return []

          const parsed = alternative as PersonaRouteResult['alternatives'][number]
          const persona = normalizePersonalityKey(parsed.persona)

          if (!persona || typeof parsed.score !== 'number' || typeof parsed.reason !== 'string') return []

          return [
            {
              persona,
              score: parsed.score,
              reason: parsed.reason,
            },
          ]
        })
      : [],
  }
}

function readChatMeta(response: Response): ChatResponseMeta {
  const raw = response.headers.get('x-vent-meta')
  if (!raw) return {}

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>
    const requestedPersona = normalizePersonalityKey(parsed.requestedPersona)
    const finalPersona = normalizePersonalityKey(parsed.finalPersona)
    const safetyNote = typeof parsed.safetyNote === 'string' ? parsed.safetyNote : undefined
    const compressedContext = parseCompressedContext(parsed.compressedContext)
    const personaSuggestion = parsePersonaSuggestion(parsed.personaSuggestion)

    return {
      requestedPersona: requestedPersona ?? undefined,
      finalPersona: finalPersona ?? undefined,
      personaSuggestion,
      safetyNote,
      compressedContext,
      contextCompressed: parsed.contextCompressed === true,
    }
  } catch {
    return {}
  }
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1 text-[var(--accent)]" aria-label="Thinking">
      <motion.span
        animate={{ opacity: [0.25, 1, 0.25] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        .
      </motion.span>
      <motion.span
        animate={{ opacity: [0.25, 1, 0.25] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: 0.18 }}
      >
        .
      </motion.span>
      <motion.span
        animate={{ opacity: [0.25, 1, 0.25] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: 0.36 }}
      >
        .
      </motion.span>
    </span>
  )
}

export function ResponsePanel({
  originalText,
  autoGenerateKey = 0,
  acceptedSuggestedPersona,
  onPersonaSuggestion,
  onGeneratingChange,
  onClearPrompt,
  className,
}: ResponsePanelProps) {
  const activePersonality = useVentStore((state) => state.activePersonality)
  const responses = useVentStore((state) => state.responses)
  const sessionMessages = useVentStore((state) => state.sessionMessages)
  const compressedContext = useVentStore((state) => state.compressedContext)
  const safetyNote = useVentStore((state) => state.safetyNote)
  const setActivePersonality = useVentStore((state) => state.setActivePersonality)
  const setStoreResponse = useVentStore((state) => state.setResponse)
  const addSessionMessage = useVentStore((state) => state.addSessionMessage)
  const applyCompressedContext = useVentStore((state) => state.applyCompressedContext)
  const setSafetyNote = useVentStore((state) => state.setSafetyNote)
  const [statuses, setStatuses] = useState<StatusMap>({})
  const [errors, setErrors] = useState<ErrorMap>({})
  const [visiblePersonality, setVisiblePersonality] = useState<PersonalityKey | null>(null)
  const lastAutoGenerateKey = useRef(0)
  const lastGeneratedAt = useRef(0)
  const idempotencyKeys = useRef(new Map<string, string>())
  const activeJob = useRef<{
    jobId: string
    close: () => void
    terminal: boolean
  } | null>(null)

  const cancelActiveJob = useCallback(() => {
    const current = activeJob.current
    if (!current) return

    current.close()
    if (!current.terminal) {
      void fetch(`/api/chat/jobs/${current.jobId}`, { method: 'DELETE', keepalive: true })
    }
    activeJob.current = null
  }, [])

  const generateResponse = useCallback(
    async (personality: PersonalityKey) => {
      const trimmed = originalText.trim()

      if (!trimmed) {
        setErrors((current) => ({
          ...current,
          [personality]: 'Write something first. Even one sentence.',
        }))
        return
      }

      if (statuses[personality] === 'loading') return

      const now = Date.now()
      if (now - lastGeneratedAt.current < 4000) {
        recordClientMetric('client_cooldown_hit', { personality })
        setErrors((current) => ({
          ...current,
          [personality]: cooldownMessages[personality],
        }))
        return
      }

      lastGeneratedAt.current = now
      cancelActiveJob()
      setVisiblePersonality(personality)
      setActivePersonality(personality)
      setStoreResponse(personality, '')
      setSafetyNote(null)
      setErrors((current) => ({ ...current, [personality]: undefined }))
      setStatuses((current) => ({ ...current, [personality]: 'loading' }))
      onGeneratingChange?.(true)

      let responsePersonality = personality
      const requestStartedAt = performance.now()
      let firstTokenAt: number | null = null
      const attemptKey = `${autoGenerateKey}:${personality}`
      const idempotencyKey = idempotencyKeys.current.get(attemptKey) ?? crypto.randomUUID()
      idempotencyKeys.current.set(attemptKey, idempotencyKey)

      try {
        recordClientMetric('api_call', { personality, characters: trimmed.length })

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify({
            message: trimmed,
            personality,
            messages: sessionMessages,
            compressedContext,
            acceptedSuggestedPersona: Boolean(acceptedSuggestedPersona && acceptedSuggestedPersona === personality),
            suggestedPersona: acceptedSuggestedPersona ?? undefined,
          }),
        })

        if (!response.ok) {
          recordClientMetric(response.status === 429 ? 'rate_limit_hit' : 'api_error', {
            personality,
            status: response.status,
            totalMs: Math.round(performance.now() - requestStartedAt),
          })
          setErrors((current) => ({
            ...current,
            [personality]: messageForStatus(response.status),
          }))
          setStatuses((current) => ({ ...current, [personality]: 'error' }))
          return
        }

        if (response.status === 202) {
          const queued = await response.json() as Partial<QueuedChatResponse>
          if (typeof queued.jobId !== 'string' || typeof queued.eventsUrl !== 'string') {
            throw new Error('Invalid inference job response')
          }
          const { jobId, eventsUrl } = queued

          let content = ''
          const eventStream = openInferenceEventStream(eventsUrl, {
            onEvent(event) {
              if (event.type === 'reset') {
                content = ''
                firstTokenAt = null
                setStoreResponse(responsePersonality, '')
              }

              if (event.type === 'meta') {
                const meta = event.data
                responsePersonality = meta.finalPersona

                if (meta.personaSuggestion) onPersonaSuggestion?.(meta.personaSuggestion)
                if (meta.contextCompressed && meta.compressedContext) applyCompressedContext(meta.compressedContext)
                setSafetyNote(meta.safetyNote ?? null)

                if (responsePersonality !== personality) {
                  setVisiblePersonality(responsePersonality)
                  setActivePersonality(responsePersonality)
                  setStoreResponse(responsePersonality, '')
                  setErrors((current) => ({
                    ...current,
                    [personality]: undefined,
                    [responsePersonality]: undefined,
                  }))
                  setStatuses((current) => ({
                    ...current,
                    [personality]: 'idle',
                    [responsePersonality]: 'loading',
                  }))
                }
              }

              if (event.type === 'token') {
                if (!firstTokenAt) {
                  firstTokenAt = performance.now()
                  console.info('vent.ai client_ttft_ms', Math.round(firstTokenAt - requestStartedAt))
                }
                content += event.data.text
                setStoreResponse(responsePersonality, content)
              }

              if (event.type === 'complete') {
                const currentJob = activeJob.current
                if (currentJob && currentJob.jobId === jobId) currentJob.terminal = true
                setStatuses((current) => ({ ...current, [responsePersonality]: 'complete' }))
                recordClientMetric('response_generated', {
                  personality: responsePersonality,
                  ttftMs: firstTokenAt ? Math.round(firstTokenAt - requestStartedAt) : undefined,
                  totalMs: Math.round(performance.now() - requestStartedAt),
                })
                if (content.trim()) {
                  addSessionMessage({
                    role: 'assistant',
                    content: content.trim(),
                    personality: responsePersonality,
                  })
                }
              }

              if (shouldResetInferenceAttempt(event.type)) {
                idempotencyKeys.current.delete(attemptKey)
                const currentJob = activeJob.current
                if (currentJob && currentJob.jobId === jobId) currentJob.terminal = true
              }
            },
          })

          activeJob.current = {
            jobId,
            close: eventStream.close,
            terminal: false,
          }
          try {
            await eventStream.done
          } finally {
            if (activeJob.current?.jobId === jobId) activeJob.current = null
          }
          return
        }

        const meta = readChatMeta(response)
        responsePersonality = meta.finalPersona ?? personality

        if (meta.personaSuggestion) {
          onPersonaSuggestion?.(meta.personaSuggestion)
        }

        if (meta.contextCompressed && meta.compressedContext) {
          applyCompressedContext(meta.compressedContext)
        }

        setSafetyNote(meta.safetyNote ?? null)

        if (responsePersonality !== personality) {
          setVisiblePersonality(responsePersonality)
          setActivePersonality(responsePersonality)
          setStoreResponse(responsePersonality, '')
          setErrors((current) => ({
            ...current,
            [personality]: undefined,
            [responsePersonality]: undefined,
          }))
          setStatuses((current) => ({
            ...current,
            [personality]: 'idle',
            [responsePersonality]: 'loading',
          }))
        }

        if (!response.body) {
          recordClientMetric('api_error', {
            personality,
            totalMs: Math.round(performance.now() - requestStartedAt),
          })
          setErrors((current) => ({
            ...current,
            [responsePersonality]: 'Something went quiet. Try again in a moment.',
          }))
          setStatuses((current) => ({ ...current, [responsePersonality]: 'error' }))
          return
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let content = ''
        let sawFirstToken = false

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          if (!sawFirstToken) {
            sawFirstToken = true
            firstTokenAt = performance.now()
            console.info('vent.ai client_ttft_ms', Math.round(firstTokenAt - requestStartedAt))
          }

          content += decoder.decode(value, { stream: true })
          setStoreResponse(responsePersonality, content)
        }

        content += decoder.decode()
        setStoreResponse(responsePersonality, content)
        setStatuses((current) => ({ ...current, [responsePersonality]: 'complete' }))
        recordClientMetric('response_generated', {
          personality: responsePersonality,
          ttftMs: firstTokenAt ? Math.round(firstTokenAt - requestStartedAt) : undefined,
          totalMs: Math.round(performance.now() - requestStartedAt),
        })

        if (content.trim()) {
          addSessionMessage({
            role: 'assistant',
            content: content.trim(),
            personality: responsePersonality,
          })
        }
      } catch {
        recordClientMetric('api_error', { personality })
        setErrors((current) => ({
          ...current,
          [responsePersonality]: 'Lost the connection. Check your network and try again.',
        }))
        setStatuses((current) => ({ ...current, [responsePersonality]: 'error' }))
      } finally {
        onGeneratingChange?.(false)
      }
    },
    [
      acceptedSuggestedPersona,
      addSessionMessage,
      applyCompressedContext,
      autoGenerateKey,
      cancelActiveJob,
      compressedContext,
      onGeneratingChange,
      onPersonaSuggestion,
      originalText,
      sessionMessages,
      setActivePersonality,
      setSafetyNote,
      setStoreResponse,
      statuses,
    ],
  )

  useEffect(() => {
    if (!autoGenerateKey || autoGenerateKey === lastAutoGenerateKey.current) return

    lastAutoGenerateKey.current = autoGenerateKey
    void generateResponse(activePersonality)
  }, [activePersonality, autoGenerateKey, generateResponse])

  useEffect(() => cancelActiveJob, [cancelActiveJob])

  const active = personalities[activePersonality]
  const activeResponse = visiblePersonality === activePersonality ? responses[activePersonality] : ''
  const activeStatus = statuses[activePersonality]
  const activeError = errors[activePersonality]
  const isLoading = activeStatus === 'loading'
  const hasResponse = Boolean(activeResponse)

  function clearResponse() {
    cancelActiveJob()
    idempotencyKeys.current.delete(`${autoGenerateKey}:${activePersonality}`)
    setStoreResponse(activePersonality, '')
    setVisiblePersonality(null)
    setErrors((current) => ({ ...current, [activePersonality]: undefined }))
    setStatuses((current) => ({ ...current, [activePersonality]: 'idle' }))
    onClearPrompt?.()
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={cn('flex min-h-0 flex-col', className)}
    >
      <AnimatePresence mode="wait">
        <motion.div key={activePersonality} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .3 }} className="space-y-5">
          {safetyNote ? <div className="mx-auto w-fit rounded-full border border-[#d8c5b2]/60 bg-white/65 px-3 py-1 text-[10px] text-[#806d60]">{safetyNote}</div> : null}

          <div>
            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold text-[#817064]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#92b4b2] text-[9px] text-white">You</span>
              You
            </div>
            <div className="ml-7 max-w-[88%] rounded-[10px_10px_10px_3px] border border-[#c9d5b6]/55 bg-[#dfe8cf] px-4 py-3 text-sm leading-6 text-[#4e493f] shadow-[0_5px_14px_rgba(82,71,55,.07)]">
              {originalText}
              <span className="mt-1 block text-right text-[9px] text-[#7f806e]">just now</span>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold text-[#817064]">
              <span className="relative h-5 w-5 overflow-hidden rounded-full border border-white shadow-sm"><Image src={personalityPortraits[activePersonality]} alt="" fill className="object-cover object-top" sizes="20px" /></span>
              {active.name}
            </div>
            <div className="relative ml-7 max-w-[94%] rotate-[-.25deg] rounded-[7px_10px_10px_3px] border border-[#d8c2a6]/70 bg-[#fff7e7] px-4 py-4 shadow-[0_7px_18px_rgba(88,62,43,.09)]">
              <span className="absolute -top-1.5 right-5 h-3 w-12 rotate-2 bg-[#ead8b8]/55" />
              <div className="whitespace-pre-wrap font-hand text-[16px] leading-7 text-[#51443a]">
                {activeResponse}
                {isLoading ? <ThinkingDots /> : null}
              </div>
              {!hasResponse && !isLoading ? (
                <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => { recordClientMetric('hear_from_clicked', { personality: activePersonality }); generateResponse(activePersonality) }}>Try again</Button>
              ) : null}
            </div>
          </div>

          {activeError ? <p className="ml-7 text-xs text-[#a15f59]">{activeError}</p> : null}

          <div className="flex justify-end">
            <button type="button" onClick={clearResponse} disabled={isLoading || !hasResponse} className="text-[10px] text-[#917e71] underline decoration-[#baa996]/50 underline-offset-4 transition hover:text-[#5e4c41] disabled:opacity-35">Clear response</button>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.section>
  )
}
