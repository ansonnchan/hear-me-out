'use client'

import { useEffect, useState } from 'react'
import { ActiveCharacter } from '@/components/active-character'
import { PersonalitySelector } from '@/components/personality-selector'
import { ResponsePanel } from '@/components/response-panel'
import { VentInput } from '@/components/vent-input'
import { type PersonalityKey } from '@/lib/personalities'
import { useVentStore } from '@/store/vent-store'

type VentStage = 'selecting' | 'writing'

interface VentPageClientProps {
  initialPersonality: PersonalityKey | null
}

export function VentPageClient({ initialPersonality }: VentPageClientProps) {
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

  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-8.5rem)] max-w-5xl flex-col pb-4 pt-4 sm:pt-6">
      {selectedPersonality ? (
        <ActiveCharacter
          personality={activePersonality}
          variant="peek"
          className="pointer-events-none fixed bottom-6 right-3 z-0 hidden h-[46vh] w-24 xl:block 2xl:w-36"
        />
      ) : null}

      <div className="relative z-10 mb-4 space-y-2 text-center">
        <p className="text-sm text-[var(--accent)]">Explore a different perspective.</p>
        <h1 className="text-balance font-display text-3xl font-medium leading-tight sm:text-4xl">
          Start with what's on your mind, and see what they say.
        </h1>
      </div>

      <div className="relative z-10 mb-4">
        <PersonalitySelector
          value={stage === 'selecting' ? selectedPersonality : activePersonality}
          onValueChange={choosePersonality}
        />
      </div>

      {stage === 'selecting' ? (
        <div className="glass-panel relative z-10 mx-auto w-full max-w-3xl rounded-[8px] p-8 text-center">
          <p className="mx-auto max-w-md font-display text-3xl leading-10 text-foreground/82">
            Whose voice do you need to hear?
          </p>
        </div>
      ) : (
        <div className="relative z-10 grid min-h-0 flex-1 gap-5 lg:grid-cols-2 lg:items-stretch">
          <section className="flex min-h-0 flex-col">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm text-muted">{submittedText ? 'Write another thought when you are ready.' : 'Write what is here.'}</p>
              {submittedText ? <p className="hidden text-xs text-muted sm:block">The current reflection stays on the right.</p> : null}
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
            <div className="mb-3 flex min-h-5 items-center justify-between gap-3">
              <p className="text-sm text-muted">{submittedText ? 'Reflection' : 'Waiting for your thought.'}</p>
              {submittedText ? <p className="hidden text-xs text-muted sm:block">Switch lenses above.</p> : null}
            </div>
            {selectedPersonality ? (
              <ActiveCharacter
                personality={activePersonality}
                variant="portrait"
                className="relative z-10 mb-3 flex justify-center lg:hidden"
              />
            ) : null}
            <div className="relative z-10 min-h-0 flex-1">
              {submittedText ? (
                <ResponsePanel
                  key={generationKey}
                  originalText={submittedText}
                  autoGenerateKey={generationKey}
                  onGeneratingChange={setIsGenerating}
                />
              ) : (
                <div className="glass-panel flex h-full min-h-[320px] items-center justify-center rounded-[8px] p-8 text-center">
                  <p className="max-w-sm font-display text-2xl leading-9 text-foreground/72">
                    Your reflection will appear here.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
