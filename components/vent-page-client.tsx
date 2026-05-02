'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { PersonalitySelector } from '@/components/personality-selector'
import { ResponsePanel } from '@/components/response-panel'
import { VentInput } from '@/components/vent-input'
import { personalityAtmospheres } from '@/lib/personality-assets'
import { type PersonalityKey } from '@/lib/personalities'
import { useVentStore } from '@/store/vent-store'

type VentStage = 'selecting' | 'writing'

interface VentPageClientProps {
  initialPersonality: PersonalityKey | null
}

export function VentPageClient({ initialPersonality }: VentPageClientProps) {
  const currentVentText = useVentStore((state) => state.currentVentText)
  const setCurrentVentText = useVentStore((state) => state.setCurrentVentText)
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
      setError(cooldownMessages[selectedPersonality])
      return
    }

    setError(null)
    setLastSubmittedAt(now)
    setResponses({})
    setActivePersonality(selectedPersonality)
    setSubmittedText(trimmed)
    setGenerationKey((key) => key + 1)
  }

  return (
    <div className="relative mx-auto max-w-4xl pb-12 pt-8 sm:pt-10">
      {selectedPersonality ? (
        <Image
          src={personalityAtmospheres[selectedPersonality]}
          alt=""
          className="pointer-events-none fixed bottom-0 right-0 z-0 hidden max-h-[54vh] w-auto translate-x-10 object-contain opacity-[0.055] lg:block"
          sizes="420px"
          priority={false}
        />
      ) : null}

      <div className="relative z-10 mb-6 space-y-3 text-center">
        <p className="text-sm text-[var(--accent)]">Same thought, different lens.</p>
        <h1 className="text-balance font-display text-4xl font-medium leading-tight sm:text-5xl">
          Let the first sentence arrive.
        </h1>
      </div>

      <div className="relative z-10 space-y-4">
        <PersonalitySelector value={selectedPersonality} onValueChange={choosePersonality} />

        {stage === 'selecting' ? (
          <div className="glass-panel rounded-[8px] p-8 text-center">
            <p className="mx-auto max-w-md font-display text-3xl leading-10 text-foreground/82">
              Who should sit with this?
            </p>
          </div>
        ) : (
          <VentInput
            value={currentVentText}
            onChange={setCurrentVentText}
            onSubmit={submit}
            isLoading={isGenerating}
            error={error}
            compact={Boolean(submittedText)}
          />
        )}
      </div>

      {submittedText ? (
        <ResponsePanel
          key={generationKey}
          originalText={submittedText}
          autoGenerateKey={generationKey}
          onGeneratingChange={setIsGenerating}
          className="relative z-10 mt-7"
        />
      ) : null}
    </div>
  )
}
