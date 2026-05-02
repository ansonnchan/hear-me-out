'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { personalities, type PersonalityKey } from '@/lib/personalities'
import { cn } from '@/lib/utils'
import { useVentStore } from '@/store/vent-store'

type StatusMap = Partial<Record<PersonalityKey, 'idle' | 'loading' | 'complete' | 'error'>>
type ErrorMap = Partial<Record<PersonalityKey, string>>

const cooldownMessages: Record<PersonalityKey, string> = {
  cotton: 'Take a breath. Try again in a moment.',
  aristotle: 'Pause for a moment. Clear thinking needs a little space.',
  ming: 'Let the water settle. Try again in a moment.',
  angel: 'Take a breath. I am still here.',
  'auntie-zhang': 'Slow down. One clean attempt at a time.',
}

interface ResponsePanelProps {
  originalText: string
  autoGenerateKey?: number
  onGeneratingChange?: (isGenerating: boolean) => void
  className?: string
}

function messageForStatus(status: number) {
  if (status === 400) return 'Write something first. Even one sentence.'
  if (status === 429) return 'Take a breath. Try again in a moment.'
  return 'Something went quiet. Try again in a moment.'
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
  onGeneratingChange,
  className,
}: ResponsePanelProps) {
  const activePersonality = useVentStore((state) => state.activePersonality)
  const responses = useVentStore((state) => state.responses)
  const setActivePersonality = useVentStore((state) => state.setActivePersonality)
  const setStoreResponse = useVentStore((state) => state.setResponse)
  const [statuses, setStatuses] = useState<StatusMap>({})
  const [errors, setErrors] = useState<ErrorMap>({})
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
        setErrors((current) => ({
          ...current,
          [personality]: cooldownMessages[personality],
        }))
        return
      }

      lastGeneratedAt.current = now
      setActivePersonality(personality)
      setStoreResponse(personality, '')
      setErrors((current) => ({ ...current, [personality]: undefined }))
      setStatuses((current) => ({ ...current, [personality]: 'loading' }))
      onGeneratingChange?.(true)

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: trimmed,
            personality,
          }),
        })

        if (!response.ok) {
          setErrors((current) => ({
            ...current,
            [personality]: messageForStatus(response.status),
          }))
          setStatuses((current) => ({ ...current, [personality]: 'error' }))
          return
        }

        if (!response.body) {
          setErrors((current) => ({
            ...current,
            [personality]: 'Something went quiet. Try again in a moment.',
          }))
          setStatuses((current) => ({ ...current, [personality]: 'error' }))
          return
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let content = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          content += decoder.decode(value, { stream: true })
          setStoreResponse(personality, content)
        }

        content += decoder.decode()
        setStoreResponse(personality, content)
        setStatuses((current) => ({ ...current, [personality]: 'complete' }))
      } catch {
        setErrors((current) => ({
          ...current,
          [personality]: 'Lost the connection. Check your network and try again.',
        }))
        setStatuses((current) => ({ ...current, [personality]: 'error' }))
      } finally {
        onGeneratingChange?.(false)
      }
    },
    [onGeneratingChange, originalText, setActivePersonality, setStoreResponse, statuses],
  )

  useEffect(() => {
    if (!autoGenerateKey || autoGenerateKey === lastAutoGenerateKey.current) return

    lastAutoGenerateKey.current = autoGenerateKey
    void generateResponse(activePersonality)
  }, [activePersonality, autoGenerateKey, generateResponse])

  const active = personalities[activePersonality]
  const activeResponse = responses[activePersonality]
  const activeStatus = statuses[activePersonality]
  const activeError = errors[activePersonality]
  const isLoading = activeStatus === 'loading'
  const hasResponse = Boolean(activeResponse)

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={cn('flex h-full min-h-0 flex-col space-y-4', className)}
    >
      <div className="glass-panel relative min-h-[260px] flex-1 overflow-hidden rounded-[8px] p-5 transition-all duration-400 ease-in-out sm:p-6">
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
            {hasResponse || isLoading ? (
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
                <div className="whitespace-pre-wrap text-lg leading-8 text-foreground/88">
                  {activeResponse}
                  {isLoading ? (
                    <ThinkingDots />
                  ) : null}
                </div>

                {activeError ? <p className="text-sm text-[var(--accent)]">{activeError}</p> : null}
              </div>
            ) : (
              <div className="flex min-h-[220px] flex-1 flex-col items-center justify-center gap-5 text-center">
                <p className="max-w-md font-display text-2xl leading-9 text-foreground/78">
                  Same thought, different lens.
                </p>
                {activeError ? <p className="text-sm text-[var(--accent)]">{activeError}</p> : null}
                <Button type="button" variant="primary" onClick={() => generateResponse(activePersonality)}>
                  Hear from {active.name}
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.section>
  )
}
