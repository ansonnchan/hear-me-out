'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PersonalitySelector } from '@/components/personality-selector'
import { ResponsePanel } from '@/components/response-panel'
import { VentChoicePanel } from '@/components/vent-choice-panel'
import { VentInput } from '@/components/vent-input'
import { defaultPersonality, type PersonalityKey } from '@/lib/personalities'
import { useVentStore } from '@/store/vent-store'

type VentStage = 'choice' | 'selecting' | 'writing'

interface VentPageClientProps {
  initialPersonality: PersonalityKey | null
}

export function VentPageClient({ initialPersonality }: VentPageClientProps) {
  const router = useRouter()
  const resetSession = useVentStore((state) => state.resetSession)
  const setActivePersonality = useVentStore((state) => state.setActivePersonality)
  const [stage, setStage] = useState<VentStage>(initialPersonality ? 'writing' : 'choice')
  const [selectedPersonality, setSelectedPersonality] = useState<PersonalityKey | null>(initialPersonality)
  const [ventText, setVentText] = useState('')
  const [submittedText, setSubmittedText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [generationKey, setGenerationKey] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    if (!initialPersonality) return

    resetSession()
    setActivePersonality(initialPersonality)
  }, [initialPersonality, resetSession, setActivePersonality])

  function beginNewVent() {
    resetSession()
    setVentText('')
    setSubmittedText('')
    setError(null)
    setSelectedPersonality(null)
    setStage('selecting')
  }

  function choosePersonality(personality: PersonalityKey) {
    setSelectedPersonality(personality)
    setStage('writing')
  }

  function submit() {
    const trimmed = ventText.trim()

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
    resetSession()
    setActivePersonality(selectedPersonality)
    setSubmittedText(trimmed)
    setGenerationKey((key) => key + 1)
  }

  if (stage === 'choice') {
    return (
      <VentChoicePanel
        onStartNew={beginNewVent}
        onContinuePrevious={() => router.push('/history')}
      />
    )
  }

  return (
    <div className="mx-auto max-w-4xl pb-12 pt-10 sm:pt-16">
      {!initialPersonality ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => setStage('choice')} className="mb-8">
          <ArrowLeft size={14} aria-hidden="true" />
          Back
        </Button>
      ) : null}

      <div className="mb-8 space-y-4 text-center">
        <p className="text-sm text-[var(--accent)]">Same thought, different lens.</p>
        <h1 className="text-balance font-display text-5xl font-medium leading-tight sm:text-6xl">
          Let the first sentence arrive.
        </h1>
      </div>

      <div className="space-y-5">
        <PersonalitySelector
          value={stage === 'selecting' ? selectedPersonality : selectedPersonality ?? defaultPersonality}
          onValueChange={choosePersonality}
        />

        {stage === 'selecting' ? (
          <div className="glass-panel rounded-[8px] p-8 text-center">
            <p className="mx-auto max-w-md font-display text-3xl leading-10 text-foreground/82">
              Who should sit with this?
            </p>
          </div>
        ) : (
          <VentInput
            value={ventText}
            onChange={setVentText}
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

