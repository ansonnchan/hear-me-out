'use client'

import { useEffect, useState } from 'react'
import { ActiveCharacter } from '@/components/active-character'
import { PersonalitySelector } from '@/components/personality-selector'
import { ResponsePanel } from '@/components/response-panel'
import { VentInput } from '@/components/vent-input'
import { WhyPersonaPanel } from '@/components/why-persona-panel'
import { routePersona, type PersonaRouteResult } from '@/lib/ai/persona-router'
import { recordClientMetric } from '@/lib/client-metrics'
import { type PersonalityKey } from '@/lib/personalities'
import { useVentStore } from '@/store/vent-store'

interface VentPageClientProps {
  initialPersonality: PersonalityKey | null
}

const PERSONA_SUGGESTION_MIN_CHARS = 50

function suggestionKey(text: string, suggestion: PersonaRouteResult | null) {
  if (!suggestion) return null
  const trimmed = text.trim()

  return `${suggestion.suggestedPersona}:${trimmed.slice(0, 120)}:${Math.floor(trimmed.length / 80)}`
}

export function VentPageClient({ initialPersonality }: VentPageClientProps) {
  const currentVentText = useVentStore((state) => state.currentVentText)
  const activePersonality = useVentStore((state) => state.activePersonality)
  const compressedContext = useVentStore((state) => state.compressedContext)
  const setCurrentVentText = useVentStore((state) => state.setCurrentVentText)
  const setCurrentVent = useVentStore((state) => state.setCurrentVent)
  const setResponses = useVentStore((state) => state.setResponses)
  const setActivePersonality = useVentStore((state) => state.setActivePersonality)
  const addSessionMessage = useVentStore((state) => state.addSessionMessage)
  const setSafetyNote = useVentStore((state) => state.setSafetyNote)
  const [selectedPersonality, setSelectedPersonality] = useState<PersonalityKey>(initialPersonality ?? activePersonality)
  const [submittedText, setSubmittedText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [generationKey, setGenerationKey] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [lastSubmittedAt, setLastSubmittedAt] = useState(0)
  const [personaSuggestion, setPersonaSuggestion] = useState<PersonaRouteResult | null>(null)
  const [dismissedSuggestionKey, setDismissedSuggestionKey] = useState<string | null>(null)
  const [acceptedSuggestedPersona, setAcceptedSuggestedPersona] = useState<PersonalityKey | null>(null)
  const [submittedAcceptedSuggestedPersona, setSubmittedAcceptedSuggestedPersona] = useState<PersonalityKey | null>(null)

  const cooldownMessages: Record<PersonalityKey, string> = {
    cotton: 'Take a breath. Try again in a moment.',
    aristotle: 'Pause for a moment. Clear thinking needs a little space.',
    'venerable-ming': 'Let the water settle. Try again in a moment.',
    angel: 'Take a breath. I am still here.',
    'auntie-zhang': 'Slow down. One clean attempt at a time.',
  }

  useEffect(() => {
    if (!initialPersonality) return

    setActivePersonality(initialPersonality)
  }, [initialPersonality, setActivePersonality])

  useEffect(() => {
    const trimmed = currentVentText.trim()

    if (trimmed.length < PERSONA_SUGGESTION_MIN_CHARS) {
      return
    }

    const timeout = window.setTimeout(() => {
      const suggestion = routePersona(trimmed)
      setPersonaSuggestion(suggestion.confidence >= 0.4 ? suggestion : null)
    }, 450)

    return () => window.clearTimeout(timeout)
  }, [currentVentText])

  function choosePersonality(personality: PersonalityKey) {
    recordClientMetric('personality_switch', { personality })
    setSelectedPersonality(personality)
    setActivePersonality(personality)
    setAcceptedSuggestedPersona(null)
  }

  function useSuggestedPersonality(personality: PersonalityKey) {
    setSelectedPersonality(personality)
    setActivePersonality(personality)
    setAcceptedSuggestedPersona(personality)
    setDismissedSuggestionKey(suggestionKey(currentVentText, personaSuggestion))
  }

  function keepCurrentChoice() {
    setAcceptedSuggestedPersona(null)
    setDismissedSuggestionKey(suggestionKey(currentVentText, personaSuggestion))
  }

  function submit() {
    const trimmed = currentVentText.trim()
    const now = Date.now()

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
    recordClientMetric('vent_submitted', { personality: activePersonality, characters: trimmed.length })
    setResponses({})
    setSafetyNote(null)
    setCurrentVent(trimmed)
    setSubmittedText(trimmed)
    setSubmittedAcceptedSuggestedPersona(acceptedSuggestedPersona)
    setAcceptedSuggestedPersona(null)
    addSessionMessage({
      role: 'user',
      content: trimmed,
    })
    setCurrentVentText('')
    setPersonaSuggestion(null)
    setGenerationKey((key) => key + 1)
  }

  const currentSuggestionKey = suggestionKey(currentVentText, personaSuggestion)
  const visibleSuggestion =
    currentVentText.trim().length >= PERSONA_SUGGESTION_MIN_CHARS &&
    personaSuggestion &&
    currentSuggestionKey !== dismissedSuggestionKey
      ? personaSuggestion
      : null

  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-8.5rem)] max-w-5xl flex-col pb-4 pt-4 sm:pt-6">
      <ActiveCharacter
        personality={activePersonality}
        variant="peek"
        className="pointer-events-none fixed bottom-6 right-3 z-0 hidden h-[46vh] w-24 xl:block 2xl:w-36"
      />

      <div className="relative z-10 mb-7 space-y-2 text-center">
        <p className="text-sm text-[var(--accent)]">Explore a different perspective.</p>
        <h1 className="text-balance font-display text-3xl font-medium leading-tight sm:text-4xl">
          Start with what&apos;s on your mind, and see what they say.
        </h1>
      </div>

      <div className="relative z-10 mb-2">
        <PersonalitySelector value={selectedPersonality} onValueChange={choosePersonality} />
      </div>

      <WhyPersonaPanel
        suggestion={visibleSuggestion}
        currentPersonality={activePersonality}
        onUseSuggested={useSuggestedPersonality}
        onKeepChoice={keepCurrentChoice}
        className="relative z-10 mx-auto mb-4 w-full max-w-3xl"
      />

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
            {compressedContext ? (
              <p className="hidden text-xs text-muted sm:block">Temporary session context active</p>
            ) : submittedText ? (
              <p className="hidden text-xs text-muted sm:block">Switch lenses above.</p>
            ) : null}
          </div>
          <ActiveCharacter
            personality={activePersonality}
            variant="portrait"
            className="relative z-10 mb-3 flex justify-center lg:hidden"
          />
          <div className="relative z-10 min-h-0 flex-1">
            {submittedText ? (
              <ResponsePanel
                key={generationKey}
                originalText={submittedText}
                autoGenerateKey={generationKey}
                acceptedSuggestedPersona={submittedAcceptedSuggestedPersona}
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
    </div>
  )
}
