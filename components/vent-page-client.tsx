'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Cat, MoreHorizontal } from 'lucide-react'
import { GentleLensDialog } from '@/components/gentle-lens-dialog'
import { PersonaSuggestionInput } from '@/components/persona-suggestion-input'
import { PersonalitySelector } from '@/components/personality-selector'
import { ResponsePanel } from '@/components/response-panel'
import { VentInput } from '@/components/vent-input'
import { routePersona, type PersonaRouteResult } from '@/lib/ai/persona-router'
import { recordClientMetric } from '@/lib/client-metrics'
import { personalityPortraits, personalityScenes } from '@/lib/personality-assets'
import { personalities, type PersonalityKey } from '@/lib/personalities'
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
      setSuggestionError('Write a little more so we have enough to find the right voice.')
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
    <div className="mx-auto h-full min-h-0 w-full max-w-[1360px]">
      {stage === 'selecting' ? (
        <div className="grid h-full min-h-0 gap-3 lg:grid-rows-[minmax(0,1.08fr)_minmax(0,.92fr)]">
          <section className="paper-texture paper-shadow relative flex min-h-0 flex-col overflow-hidden rounded-[18px] border border-[#cbb79f]/25 px-4 py-5 sm:px-7 sm:py-6 lg:px-10">
            <span className="absolute left-[8%] top-[15%] h-2.5 w-2.5 rotate-45 rounded-[3px] bg-[#f1bec4]/55" />
            <span className="absolute right-[8%] top-[11%] h-2 w-2 rotate-12 rounded-full bg-[#efc4c8]/55" />
            <div className="mx-auto mb-3 max-w-2xl text-center">
              <p className="font-hand text-base text-[#947864]">Who would you like to hear today?</p>
              <h1 className="mt-0.5 font-hand text-3xl font-bold text-[#493a32] sm:text-4xl">Choose a personality</h1>
              <p className="mt-1 text-xs text-[#78685d] sm:text-sm">Each has a different way of seeing the world.</p>
            </div>
            <PersonalitySelector value={selectedPersonality} onValueChange={choosePersonality} variant="cards" className="mx-auto w-full max-w-[1120px] flex-1" />
            <Cat className="absolute bottom-3 right-5 text-[#a98c77]/45" size={34} strokeWidth={1.2} />
          </section>

          <PersonaSuggestionInput
            value={currentVentText}
            suggestion={visibleSuggestion}
            error={suggestionError}
            isChecking={isCheckingSuggestion}
            onChange={changeSuggestionText}
            onRequestSuggestion={requestPersonaSuggestion}
            onUseSuggested={useSuggestedPersonality}
            className="max-w-none"
          />
        </div>
      ) : (
        <section className="paper-shadow grid h-full min-h-0 overflow-hidden rounded-[18px] border border-[#c9b49c]/30 bg-[#f8efdf] lg:grid-cols-[72px_minmax(360px,440px)_1fr]">
          <PersonalitySelector value={selectedPersonality} onValueChange={choosePersonality} variant="rail" />

          <div className="paper-texture flex min-h-0 min-w-0 flex-col border-[#cdbba6]/40 lg:border-r">
            <header className="relative border-b border-[#d9c8b6]/45 px-5 py-4 text-center">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#8d7a6d]">Talking with</p>
              <div className="mt-1 flex items-center justify-center gap-2">
                <span className="relative h-7 w-7 overflow-hidden rounded-full border-2 border-white shadow-sm">
                  <Image src={personalityPortraits[activePersonality]} alt="" fill className="object-cover object-top" sizes="28px" />
                </span>
                <h1 className="font-hand text-2xl font-bold text-[#493a32]">{personalities[activePersonality].name}</h1>
                <span className="text-lg text-[#92a883]">{personalities[activePersonality].emoji}</span>
              </div>
              <MoreHorizontal className="absolute right-4 top-5 text-[#9f8b7d]" size={18} />
              {compressedContext ? <p className="mt-1 text-[9px] text-[#9a887b]">temporary context active</p> : null}
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
              {submittedText ? (
                  <ResponsePanel
                    key={generationKey}
                    originalText={submittedText}
                    autoGenerateKey={generationKey}
                    acceptedSuggestedPersona={submittedAcceptedSuggestedPersona}
                    onGeneratingChange={setIsGenerating}
                  />
                ) : (
                  <div className="flex h-full min-h-[300px] flex-col items-center justify-center px-8 text-center">
                    <span className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-white shadow-md"><Image src={personalityPortraits[activePersonality]} alt="" fill className="object-cover object-top" sizes="64px" /></span>
                    <p className="mt-4 font-hand text-xl text-[#725f52]">I&apos;m here when you&apos;re ready.</p>
                    <p className="mt-1 max-w-xs text-xs leading-5 text-[#968377]">Write the thought exactly as it arrived. It does not have to be polished.</p>
                  </div>
                )}
            </div>

            <div className="border-t border-[#d9c8b6]/45 bg-[#fffaf0]/75 p-3.5">
              <VentInput value={currentVentText} onChange={setCurrentVentText} onSubmit={submit} isLoading={isGenerating} error={error} compact />
            </div>
          </div>

          <div className="relative min-h-[260px] overflow-hidden lg:min-h-0">
            <Image key={activePersonality} src={personalityScenes[activePersonality]} alt={`${personalities[activePersonality].name} in their illustrated space`} fill priority className="object-cover object-center" sizes="(max-width: 1024px) 100vw, 58vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#3c291f]/28 via-transparent to-white/5" />
            <div className="absolute bottom-4 right-4 rounded-full border border-white/30 bg-[#3b2921]/35 px-3 py-1.5 text-[10px] text-white/80 backdrop-blur-md">
              Same thought. Different lens.
            </div>
          </div>
        </section>
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
