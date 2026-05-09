'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import type { CompressedContext } from '@/lib/ai/context-compressor'
import type { PersonaRouteResult } from '@/lib/ai/persona-router'
import { recordClientMetric } from '@/lib/client-metrics'
import { personalityAtmospheres } from '@/lib/personality-assets'
import { normalizePersonalityKey, personalities, type PersonalityKey } from '@/lib/personalities'
import { cn } from '@/lib/utils'
import { useVentStore } from '@/store/vent-store'

type StatusMap = Partial<Record<PersonalityKey, 'idle' | 'loading' | 'complete' | 'error'>>
type ErrorMap = Partial<Record<PersonalityKey, string>>

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

      try {
        recordClientMetric('api_call', { personality, characters: trimmed.length })

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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

  const active = personalities[activePersonality]
  const activeResponse = visiblePersonality === activePersonality ? responses[activePersonality] : ''
  const activeStatus = statuses[activePersonality]
  const activeError = errors[activePersonality]
  const isLoading = activeStatus === 'loading'
  const hasResponse = Boolean(activeResponse)

  function clearResponse() {
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
      className={cn('flex h-full min-h-0 flex-col space-y-4', className)}
    >
      <div className="glass-panel relative min-h-[260px] flex-1 overflow-hidden rounded-[8px] border-[color-mix(in_srgb,var(--accent)_30%,transparent)] p-5 shadow-[0_0_46px_color-mix(in_srgb,var(--accent)_24%,transparent)] transition-all duration-400 ease-in-out sm:p-6">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-70 transition-colors duration-400"
          style={{
            background: `linear-gradient(180deg, ${active.glow}, transparent)`,
          }}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={activePersonality}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex h-full min-h-[220px] flex-col"
          >
            {safetyNote ? (
              <div className="mb-4 inline-flex w-fit rounded-full border border-[var(--color-border)] bg-[rgba(255,255,255,0.045)] px-3 py-1 text-xs text-muted">
                {safetyNote}
              </div>
            ) : null}

            {hasResponse || isLoading ? (
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
                <p className="border-l border-[color-mix(in_srgb,var(--accent)_36%,transparent)] pl-4 text-sm leading-6 text-muted">
                  {originalText}
                </p>
                <div className="whitespace-pre-wrap text-lg leading-8 text-foreground/88">
                  {activeResponse}
                  {isLoading ? <ThinkingDots /> : null}
                </div>

                {activeError ? <p className="text-sm text-[var(--accent)]">{activeError}</p> : null}
              </div>
            ) : (
              <div className="flex min-h-[260px] flex-1 flex-col items-center justify-center gap-5 text-center">
                <div className="relative h-32 w-32 overflow-hidden rounded-full border border-[color-mix(in_srgb,var(--accent)_36%,transparent)] bg-[rgba(255,255,255,0.04)] shadow-[0_0_42px_var(--glow)]">
                  <Image
                    src={personalityAtmospheres[activePersonality]}
                    alt=""
                    fill
                    className="object-cover object-top opacity-90"
                    sizes="128px"
                  />
                </div>
                {activeError ? <p className="text-sm text-[var(--accent)]">{activeError}</p> : null}
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  className="px-8 text-lg shadow-[0_0_42px_color-mix(in_srgb,var(--accent)_24%,transparent)]"
                  onClick={() => {
                    recordClientMetric('hear_from_clicked', { personality: activePersonality })
                    generateResponse(activePersonality)
                  }}
                >
                  Vent again
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-h-5 text-sm text-[var(--accent)]" />
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={clearResponse}
          disabled={isLoading || !hasResponse}
          className="border-[color-mix(in_srgb,var(--accent)_48%,transparent)] bg-transparent text-[var(--accent)] shadow-[0_0_24px_color-mix(in_srgb,var(--accent)_14%,transparent)] hover:border-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]"
        >
          Clear response
        </Button>
      </div>
    </motion.section>
  )
}
