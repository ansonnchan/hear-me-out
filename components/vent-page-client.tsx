'use client'

import { useEffect, useState } from 'react'
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
  const setCurrentVentText = useVentStore((state) => state.setCurrentVentText)
  const setResponses = useVentStore((state) => state.setResponses)
  const setActivePersonality = useVentStore((state) => state.setActivePersonality)
  const [stage, setStage] = useState<VentStage>(initialPersonality ? 'writing' : 'selecting')
  const [selectedPersonality, setSelectedPersonality] = useState<PersonalityKey | null>(initialPersonality)
  const [submittedText, setSubmittedText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [generationKey, setGenerationKey] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)

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

    if (!selectedPersonality) {
      setError('Choose a voice first.')
      setStage('selecting')
      return
    }

    if (!trimmed) {
      setError('Write something first. Even one sentence.')
      return
    }

    setError(null)
    setResponses({})
    setActivePersonality(selectedPersonality)
    setSubmittedText(trimmed)
    setGenerationKey((key) => key + 1)
  }

  return (
    <div className="mx-auto max-w-4xl pb-12 pt-10 sm:pt-16">
      <div className="mb-8 space-y-4 text-center">
        <p className="text-sm text-[var(--accent)]">Same thought, different lens.</p>
        <h1 className="text-balance font-display text-5xl font-medium leading-tight sm:text-6xl">
          Let the first sentence arrive.
        </h1>
      </div>

      <div className="space-y-5">
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
          />
        )}
      </div>

      {submittedText ? (
        <ResponsePanel
          key={generationKey}
          originalText={submittedText}
          autoGenerateKey={generationKey}
          onGeneratingChange={setIsGenerating}
          className="mt-12"
        />
      ) : null}
    </div>
  )
}
