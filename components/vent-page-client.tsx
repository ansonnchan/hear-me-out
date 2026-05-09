'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { ActiveCharacter } from '@/components/active-character'
import { GentleLensDialog } from '@/components/gentle-lens-dialog'
import { PersonaSuggestionInput } from '@/components/persona-suggestion-input'
import { PersonalitySelector } from '@/components/personality-selector'
import { ResponsePanel } from '@/components/response-panel'
import { VentInput } from '@/components/vent-input'
import { routePersona, type PersonaRouteResult } from '@/lib/ai/persona-router'
import { recordClientMetric } from '@/lib/client-metrics'
import { personalityAtmospheres } from '@/lib/personality-assets'
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
  /\b(?:hopeless|worthless|empty|unbearable|pointless)\b/i,
  /\b(?:panic\s+attack|severe\s+panic|breaking\s+point|no\s+way\s+out)\b/i,
  /\bfalling\s+apart\b/i,
  /\b(?:no\s+reason\s+to\s+live|better\s+off\s+without\s+me|everyone\s+would\s+be\s+better\s+off)\b/i,
  /\b(?:wish\s+i\s+was\s+dead|wish\s+i\s+were\s+dead|want\s+to\s+disappear|i\s+want\s+to\s+die)\b/i,
  /\bi\s+(?:might|may)\s+do\s+something\s+(?:bad|dangerous|unsafe)\b/i,
  /\bi\s+do\s+not\s+trust\s+myself\b/i,
  /\bi\s+don't\s+trust\s+myself\b/i,
]
const urgentSafetyPatterns = [
  /\b(kill|hurt|harm)\s+myself\b/i,
  /\b(end|take)\s+my\s+life\b/i,
  /\bsuicid(?:e|al)\b/i,
  /\bself[-\s]?harm\b/i,
  /\bi\s*(?:am|'m)?\s*(?:going to|gonna|about to)\s+(?:hurt|harm|kill)\b/i,
  /\b(?:hurt|kill)\s+someone\b/i,
  /\bnot\s+safe\s+right\s+now\b/i,
  /\bcan(?:'|no)t\s+keep\s+myself\s+safe\b/i,
  /\bimmediate\s+danger\b/i,
  /\bi\s+have\s+a\s+plan\b/i,
  /\bthis\s+is\s+my\s+(?:final|last)\s+(?:message|note|goodbye)\b/i,
  /\bsaying\s+goodbye\b/i,
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
  const [selectedPersonality, setSelectedPersonality] = useState<PersonalityKey | null>(initialPersonality)
  const [submittedText, setSubmittedText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [suggestionError, setSuggestionError] = useState<string | null>(null)
  const [generationKey, setGenerationKey] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCheckingSuggestion, setIsCheckingSuggestion] = useState(false)
  const [lastSubmittedAt, setLastSubmittedAt] = useState(0)
  const [personaSuggestion, setPersonaSuggestion] = useState<PersonaRouteResult | null>(null)
  const [dismissedSuggestionKey, setDismissedSuggestionKey] = useState<string | null>(null)
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

  function choosePersonality(personality: PersonalityKey) {
    recordClientMetric('personality_switch', { personality })
    setSelectedPersonality(personality)
    setActivePersonality(personality)
    setSuggestionError(null)
    setPersonaSuggestion(null)
    setStage('writing')
  }

  function changeSuggestionText(value: string) {
    setCurrentVentText(value)
    setSuggestionError(null)
    setPersonaSuggestion(null)
    setDismissedSuggestionKey(null)
  }

  async function shouldOfferGentleLensFromServer(message: string) {
    try {
      const response = await fetch('/api/safety', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          personality: selectedPersonality ?? 'auntie-zhang',
        }),
      })

      if (!response.ok) return false

      const result = (await response.json()) as { shouldOfferGentleLens?: unknown }
      return result.shouldOfferGentleLens === true
    } catch {
      return false
    }
  }

  async function requestPersonaSuggestion() {
    const trimmed = currentVentText.trim()

    if (stage !== 'selecting' || submittedText) return

    setIsCheckingSuggestion(true)

    if (shouldOfferGentleLens(trimmed, 'auntie-zhang')) {
      setSuggestionError(null)
      setIsCheckingSuggestion(false)
      setGentleLensPromptOpen(true)
      return
    }

    const serverSuggestsGentleLens = await shouldOfferGentleLensFromServer(trimmed)
    if (serverSuggestsGentleLens) {
      setSuggestionError(null)
      setIsCheckingSuggestion(false)
      setGentleLensPromptOpen(true)
      return
    }

    if (trimmed.length < PERSONA_SUGGESTION_MIN_CHARS) {
      setSuggestionError('Write a little more so vent.ai has enough to work with.')
      setPersonaSuggestion(null)
      setIsCheckingSuggestion(false)
      return
    }

    const suggestion = routePersona(trimmed)
    setSuggestionError(null)
    setPersonaSuggestion(suggestion.confidence >= 0.4 ? suggestion : null)
    setIsCheckingSuggestion(false)
  }

  function useSuggestedPersonality() {
    if (!personaSuggestion) return

    const personality = personaSuggestion.suggestedPersona

    setSelectedPersonality(personality)
    setActivePersonality(personality)
    setDismissedSuggestionKey(suggestionKey(currentVentText, personaSuggestion))
    submitWithPersonality(personality, personality)
  }

  function submitWithPersonality(personality: PersonalityKey, acceptedSuggestion: PersonalityKey | null = null) {
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
    setSubmittedAcceptedSuggestedPersona(acceptedSuggestion)
    setSuggestionError(null)
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

    if (!selectedPersonality) {
      setError('Choose a voice first.')
      setStage('selecting')
      return
    }

    if (shouldOfferGentleLens(trimmed, activePersonality)) {
      setError(null)
      setGentleLensPromptOpen(true)
      return
    }

    submitWithPersonality(activePersonality)
  }

  function chooseGentleLens(personality: GentlePersona) {
    setGentleLensPromptOpen(false)
    submitWithPersonality(personality)
  }

  const currentSuggestionKey = suggestionKey(currentVentText, personaSuggestion)
  const visibleSuggestion =
    stage === 'selecting' &&
    !submittedText &&
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
        <div className="relative z-10 mx-auto w-full max-w-3xl space-y-4">
          <div className="glass-panel rounded-[8px] p-8 text-center shadow-[0_24px_90px_rgba(0,0,0,0.34)]">
            <p className="font-display text-3xl leading-10 text-foreground/88">
              Whose voice do you need to hear?
            </p>
            <p className="mt-4 text-sm text-muted">Same thought. Different lens.</p>
          </div>

          <PersonaSuggestionInput
            value={currentVentText}
            suggestion={visibleSuggestion}
            error={suggestionError}
            isChecking={isCheckingSuggestion}
            onChange={changeSuggestionText}
            onRequestSuggestion={requestPersonaSuggestion}
            onUseSuggested={useSuggestedPersonality}
          />
        </div>
      ) : (
        <>
          <div className="relative z-10 grid min-h-0 flex-1 gap-5 lg:grid-cols-2 lg:items-stretch">
            <section className="flex min-h-0 flex-col">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm text-muted">Write what is here.</p>
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
                <p className="text-sm text-muted">Waiting for your thought.</p>
                {compressedContext ? (
                  <p className="hidden text-xs text-muted sm:block">Temporary session context active</p>
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
                    <div className="relative h-44 w-44 overflow-hidden rounded-full border border-[color-mix(in_srgb,var(--accent)_36%,transparent)] bg-[rgba(255,255,255,0.04)] shadow-[0_0_54px_var(--glow)] sm:h-52 sm:w-52">
                      <Image
                        src={personalityAtmospheres[activePersonality]}
                        alt=""
                        fill
                        className="object-cover object-top opacity-90"
                        sizes="208px"
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </>
      )}

      <GentleLensDialog
        open={gentleLensPromptOpen}
        currentPersonality={selectedPersonality}
        onChoose={chooseGentleLens}
        onClose={() => setGentleLensPromptOpen(false)}
      />
    </div>
  )
}
