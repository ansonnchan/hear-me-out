'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ActiveCharacter } from '@/components/active-character'
import { PersonalitySelector } from '@/components/personality-selector'
import { ResponsePanel } from '@/components/response-panel'
import { VentInput } from '@/components/vent-input'
import { personalityAtmospheres } from '@/lib/personality-assets'
import { type PersonalityKey } from '@/lib/personalities'
import { useVentStore } from '@/store/vent-store'

type VentStage = 'selecting' | 'writing'

const selectionSubtitles = [
  'Same thought. Different lens.',
  'Choose the voice that meets this moment.',
  'Five ways to hear yourself think.',
]

interface VentPageClientProps {
  initialPersonality: PersonalityKey | null
}

export function VentPageClient({ initialPersonality }: VentPageClientProps) {
  const shouldReduceMotion = useReducedMotion()
  const currentVentText = useVentStore((state) => state.currentVentText)
  const activePersonality = useVentStore((state) => state.activePersonality)
  const setCurrentVentText = useVentStore((state) => state.setCurrentVentText)
  const setCurrentVent = useVentStore((state) => state.setCurrentVent)
  const setResponses = useVentStore((state) => state.setResponses)
  const setActivePersonality = useVentStore((state) => state.setActivePersonality)
  const [stage, setStage] = useState<VentStage>(initialPersonality ? 'writing' : 'selecting')
  const [selectedPersonality, setSelectedPersonality] = useState<PersonalityKey | null>(initialPersonality)
  const [submittedText, setSubmittedText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [generationKey, setGenerationKey] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [lastSubmittedAt, setLastSubmittedAt] = useState(0)
  const [subtitleIndex, setSubtitleIndex] = useState(0)

  const cooldownMessages: Record<PersonalityKey, string> = {
    cotton: 'Take a breath. Try again in a moment.',
    aristotle: 'Pause for a moment. Clear thinking needs a little space.',
    ming: 'Let the water settle. Try again in a moment.',
    angel: 'Take a breath. I am still here.',
    'auntie-zhang': 'Slow down. One clean attempt at a time.',
  }

  useEffect(() => {
    if (!initialPersonality) return

    setActivePersonality(initialPersonality)
  }, [initialPersonality, setActivePersonality])

  useEffect(() => {
    if (shouldReduceMotion) return

    const interval = window.setInterval(() => {
      setSubtitleIndex((index) => (index + 1) % selectionSubtitles.length)
    }, 4800)

    return () => window.clearInterval(interval)
  }, [shouldReduceMotion])

  function choosePersonality(personality: PersonalityKey) {
    setSelectedPersonality(personality)
    setActivePersonality(personality)
    setStage('writing')
  }

  function submit() {
    const trimmed = currentVentText.trim()
    const now = Date.now()

    if (!selectedPersonality) {
      setError('Choose a voice first.')
      setStage('selecting')
      return
    }

    if (!trimmed) {
      setError('Write something first. Even one sentence.')
      return
    }

    if (now - lastSubmittedAt < 4000) {
      setError(cooldownMessages[activePersonality])
      return
    }

    setError(null)
    setLastSubmittedAt(now)
    setResponses({})
    setActivePersonality(activePersonality)
    setCurrentVent(trimmed)
    setSubmittedText(trimmed)
    setCurrentVentText('')
    setGenerationKey((key) => key + 1)
  }

  function clearSubmittedPrompt() {
    setSubmittedText('')
    setCurrentVent('')
    setResponses({})
    setError(null)
  }

  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-8.5rem)] max-w-5xl flex-col pb-4 pt-14 sm:pt-16">
      {submittedText ? (
        <ActiveCharacter
          personality={activePersonality}
          variant="peek"
          className="pointer-events-none fixed -bottom-10 -right-44 z-0 hidden h-[68vh] w-[20rem] lg:block 2xl:-right-56 2xl:w-[28rem]"
        />
      ) : null}

      <div className="relative z-10 mb-7 space-y-2 text-center">
        <p className="text-sm text-[var(--accent)]">Explore a different perspective.</p>
        <h1 className="text-balance font-display text-3xl font-medium leading-tight sm:text-4xl">
          Start with what&apos;s on your mind, and see what they say.
        </h1>
      </div>

      <div className="relative z-10 mb-9">
        <PersonalitySelector
          value={stage === 'selecting' ? selectedPersonality : activePersonality}
          onValueChange={choosePersonality}
        />
      </div>

      <AnimatePresence mode="wait">
        {stage === 'selecting' ? (
          <motion.div
            key="selecting"
            initial={{ opacity: 0, y: 12, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.985 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="glass-panel soft-ring relative z-10 mx-auto w-full max-w-3xl rounded-[8px] p-8 text-center"
          >
            <p className="mx-auto max-w-md font-display text-3xl leading-10 text-foreground/82">
              Whose voice do you need to hear?
            </p>
            <AnimatePresence mode="wait">
              <motion.p
                key={shouldReduceMotion ? 'reduced' : subtitleIndex}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 0.62, y: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="mt-3 h-6 text-sm leading-6 text-muted"
              >
                {selectionSubtitles[shouldReduceMotion ? 0 : subtitleIndex]}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="writing"
            initial={{ opacity: 0, y: 14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.985 }}
            transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 grid min-h-0 flex-1 gap-5 lg:grid-cols-2 lg:items-stretch"
          >
            <section className="flex min-h-0 flex-col">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="truncate text-sm text-muted">{submittedText ? "Write another thought when you're ready." : 'Write what is here.'}</p>
              </div>
              <div className="min-h-0 flex-1">
                <VentInput
                  value={currentVentText}
                  onChange={setCurrentVentText}
                  onSubmit={submit}
                  isLoading={isGenerating}
                  error={error}
                  compact
                  fill
                />
              </div>
            </section>

            <section className="relative flex min-h-[360px] flex-col lg:min-h-0">
              {selectedPersonality ? (
                <ActiveCharacter
                  personality={activePersonality}
                  variant="portrait"
                  className="relative z-10 mb-3 flex justify-center lg:hidden"
                />
              ) : null}
              <div className="relative z-10 min-h-0 flex-1">
                <AnimatePresence mode="wait">
                  {submittedText ? (
                    <motion.div
                      key="response"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full"
                    >
                      <ResponsePanel
                        key={generationKey}
                        originalText={submittedText}
                        autoGenerateKey={generationKey}
                        onGeneratingChange={setIsGenerating}
                        onClearPrompt={clearSubmittedPrompt}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                      className="glass-panel relative flex h-full min-h-[320px] items-end justify-end overflow-hidden rounded-[8px] border-[color-mix(in_srgb,var(--accent)_30%,transparent)] p-0 shadow-[0_0_46px_color-mix(in_srgb,var(--accent)_24%,transparent)]"
                    >
                      <Image
                        src={personalityAtmospheres[activePersonality]}
                        alt=""
                        className="h-full w-full object-contain object-right-bottom opacity-[0.65]"
                        sizes="(min-width: 1024px) 480px, 100vw"
                        priority={false}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
