'use client'

import { useEffect, useState } from 'react'
import { ActiveCharacter } from '@/components/active-character'
import { GentleLensDialog } from '@/components/gentle-lens-dialog'
import { PersonalitySelector } from '@/components/personality-selector'
import { ResponsePanel } from '@/components/response-panel'
import { VentInput } from '@/components/vent-input'
import { WhyPersonaPanel } from '@/components/why-persona-panel'
import { routePersona, type PersonaRouteResult } from '@/lib/ai/persona-router'
import { recordClientMetric } from '@/lib/client-metrics'
import { type PersonalityKey } from '@/lib/personalities'
import { useVentStore } from '@/store/vent-store'

type VentStage = 'selecting' | 'writing'
type GentlePersona = Extract<PersonalityKey, 'cotton' | 'angel'>

interface VentPageClientProps {
  initialPersonality: PersonalityKey | null
}

const PERSONA_SUGGESTION_MIN_CHARS = 50
const elevatedSafetyPatterns = [
  /\bi\s+can(?:'|no)t\s+(?:go\s+on|do\s+this|take\s+it|cope)\b/i,
  /\bi\s+do\s+not\s+want\s+to\s+(?:be\s+here|exist|wake\s+up)\b/i,
  /\bi\s+don't\s+want\s+to\s+(?:be\s+here|exist|wake\s+up)\b/i,
  /\b(?:hopeless|worthless|empty|unbearable)\b/i,
  /\b(?:panic\s+attack|severe\s+panic|breaking\s+point|no\s+way\s+out)\b/i,
  /\bfalling\s+apart\b/i,
]
const urgentSafetyPatterns = [
  /\b(kill|hurt)\s+myself\b/i,
  /\b(end|take)\s+my\s+life\b/i,
  /\bsuicid(?:e|al)\b/i,
  /\bself[-\s]?harm\b/i,
  /\bi\s*(?:am|'m)?\s*(?:going to|gonna|about to)\s+(?:hurt|kill)\b/i,
  /\b(?:hurt|kill)\s+someone\b/i,
  /\bnot\s+safe\s+right\s+now\b/i,
  /\bimmediate\s+danger\b/i,
]

function suggestionKey(text: string, suggestion: PersonaRouteResult | null) {
  if (!suggestion) return null
  const trimmed = text.trim()

  return `${suggestion.suggestedPersona}:${trimmed.slice(0, 120)}:${Math.floor(trimmed.length / 80)}`
}

function shouldOfferGentleLens(message: string, personality: PersonalityKey) {
  if (personality === 'cotton' || personality === 'angel') return false

  return (
    elevatedSafetyPatterns.some((pattern) => pattern.test(message)) ||
    urgentSafetyPatterns.some((pattern) => pattern.test(message))
  )
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
  const [stage, setStage] = useState<VentStage>(initialPersonality ? 'writing' : 'selecting')
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
  const [gentleLensPromptOpen, setGentleLensPromptOpen] = useState(false)

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
    setStage('writing')
  }

  function useSuggestedPersonality(personality: PersonalityKey) {
    setSelectedPersonality(personality)
    setActivePersonality(personality)
    setAcceptedSuggestedPersona(personality)
    setDismissedSuggestionKey(suggestionKey(currentVentText, personaSuggestion))
    setStage('writing')
  }

  function keepCurrentChoice() {
    setAcceptedSuggestedPersona(null)
    setDismissedSuggestionKey(suggestionKey(currentVentText, personaSuggestion))
  }

  function submitWithPersonality(personality: PersonalityKey) {
    const trimmed = currentVentText.trim()
    const now = Date.now()

    if (!trimmed) {
      setError('Write something first. Even one sentence.')
      return
    }

    if (now - lastSubmittedAt < 4000) {
      setError(cooldownMessages[personality])
      return
    }

    setError(null)
    setLastSubmittedAt(now)
    recordClientMetric('vent_submitted', { personality, characters: trimmed.length })
    setResponses({})
    setSafetyNote(null)
    setSelectedPersonality(personality)
    setActivePersonality(personality)
    setStage('writing')
    setCurrentVent(trimmed)
    setSubmittedText(trimmed)
    setSubmittedAcceptedSuggestedPersona(acceptedSuggestedPersona === personality ? acceptedSuggestedPersona : null)
    setAcceptedSuggestedPersona(null)
    addSessionMessage({
      role: 'user',
      content: trimmed,
    })
    setCurrentVentText('')
    setPersonaSuggestion(null)
    setGenerationKey((key) => key + 1)
  }

  function submit() {
    const trimmed = currentVentText.trim()

    if (shouldOfferGentleLens(trimmed, activePersonality)) {
      setError(null)
      setGentleLensPromptOpen(true)
      return
    }

    submitWithPersonality(activePersonality)
  }

  function chooseGentleLens(personality: GentlePersona) {
    setGentleLensPromptOpen(false)
    setAcceptedSuggestedPersona(null)
    submitWithPersonality(personality)
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
      {stage === 'writing' ? (
        <ActiveCharacter
          personality={activePersonality}
          variant="peek"
          className="pointer-events-none fixed bottom-6 right-3 z-0 hidden h-[46vh] w-24 xl:block 2xl:w-36"
        />
      ) : null}

      <div className="relative z-10 mb-7 space-y-2 text-center">
        <p className="text-sm text-[var(--accent)]">Explore a different perspective.</p>
        <h1 className="text-balance font-display text-3xl font-medium leading-tight sm:text-4xl">
          Start with what&apos;s on your mind, and see what they say.
        </h1>
      </div>

      <div className="relative z-10 mb-2">
        <PersonalitySelector value={selectedPersonality} onValueChange={choosePersonality} />
      </div>

      {stage === 'selecting' ? (
        <div className="glass-panel relative z-10 mx-auto w-full max-w-3xl rounded-[8px] p-6 text-center shadow-[0_24px_90px_rgba(0,0,0,0.34)] sm:p-8">
          <div className="space-y-3">
            <p className="font-display text-3xl leading-10 text-foreground/88">
              Whose voice do you need to hear?
            </p>
            <p className="text-sm text-muted">Same thought. Different lens.</p>
          </div>

          <div className="mx-auto mt-7 max-w-2xl rounded-[8px] border border-[rgba(245,158,11,0.34)] bg-[rgba(245,158,11,0.055)] p-4 text-left shadow-[0_0_42px_rgba(245,158,11,0.08)]">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[rgba(245,158,11,0.42)] px-2 py-0.5 text-xs text-[#FBBF24]">
                New
              </span>
              <p className="text-sm text-foreground/78">
                Try our new feature: Vent can suggest a lens from what you write.
              </p>
            </div>
            <textarea
              value={currentVentText}
              onChange={(event) => setCurrentVentText(event.target.value)}
              placeholder="Write a sentence about your mood or situation. You can keep it short."
              className="h-28 w-full resize-none rounded-[8px] border border-[var(--color-border)] bg-[rgba(255,255,255,0.035)] px-4 py-3 text-base leading-7 text-foreground outline-none placeholder:text-foreground/28 focus:border-[#FBBF24] focus:shadow-[0_0_28px_rgba(245,158,11,0.12)]"
            />
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted">
              <span>Manual choice still works above.</span>
              <span>{currentVentText.length.toLocaleString()}</span>
            </div>
            {visibleSuggestion ? (
              <WhyPersonaPanel
                suggestion={visibleSuggestion}
                currentPersonality={activePersonality}
                onUseSuggested={useSuggestedPersonality}
                onKeepChoice={keepCurrentChoice}
                className="mt-4"
              />
            ) : (
              <p className="mt-4 text-center text-sm text-muted">
                Not sure who to choose? Start writing and Vent can suggest a lens.
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          {visibleSuggestion ? (
            <WhyPersonaPanel
              suggestion={visibleSuggestion}
              currentPersonality={activePersonality}
              onUseSuggested={useSuggestedPersonality}
              onKeepChoice={keepCurrentChoice}
              className="relative z-10 mx-auto mb-4 w-full max-w-3xl"
            />
          ) : null}

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
        </>
      )}

      <GentleLensDialog
        open={gentleLensPromptOpen}
        currentPersonality={activePersonality}
        onChoose={chooseGentleLens}
        onClose={() => setGentleLensPromptOpen(false)}
      />
    </div>
  )
}
