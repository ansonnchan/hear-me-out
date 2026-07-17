'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Cat, CircleHelp, MoreHorizontal } from 'lucide-react'
import { GentleLensDialog } from '@/components/gentle-lens-dialog'
import { PersonaSuggestionInput } from '@/components/persona-suggestion-input'
import { PersonalitySelector } from '@/components/personality-selector'
import { ResponsePanel } from '@/components/response-panel'
import { VentInput } from '@/components/vent-input'
import { routePersona, type PersonaRouteResult } from '@/lib/ai/persona-router'
import { recordClientMetric } from '@/lib/client-metrics'
import { personalityLoadingScenes, personalityPortraits, personalityScenes } from '@/lib/personality-assets'
import { personalities, personalityList, type PersonalityKey } from '@/lib/personalities'
import { useVentStore } from '@/store/vent-store'
import heroArtwork from '@/assets/hear-me-out-hero-v2.png'
import matchingCharactersLeft from '@/assets/matching-characters-left.png'
import matchingCharactersRight from '@/assets/matching-characters-right.png'

type VentStage = 'selecting' | 'suggesting' | 'loading' | 'writing'
type GentlePersona = Extract<PersonalityKey, 'cotton' | 'angel'>

interface VentPageClientProps {
  initialPersonality: PersonalityKey | null
}

const PERSONA_SUGGESTION_MIN_CHARS = 50
const loadingCopy: Record<PersonalityKey, { title: string; description: string }> = {
  cotton: { title: 'Making a soft place for your thought…', description: 'Cotton is gathering a little gentleness.' },
  aristotle: { title: 'Opening the right page…', description: 'Aristotle is tracing the threads of your thought.' },
  'venerable-ming': { title: 'Letting the water settle…', description: 'Ming is pouring a quiet cup of tea.' },
  angel: { title: 'Saving a little light for you…', description: 'Angel is finding the hopeful thread.' },
  'auntie-zhang': { title: 'Getting straight to the point…', description: 'Auntie Zhang is readying an honest word.' },
}
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

  useEffect(() => {
    if (stage !== 'loading' || !selectedPersonality) return

    const timeout = window.setTimeout(() => setStage('writing'), 1800)
    return () => window.clearTimeout(timeout)
  }, [selectedPersonality, stage])

  function choosePersonality(personality: PersonalityKey) {
    recordClientMetric('personality_switch', { personality })
    setSelectedPersonality(personality)
    setActivePersonality(personality)
    setSuggestionError(null)
    setPersonaSuggestion(null)
    setStage('loading')
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

    if (stage !== 'suggesting' || submittedText) return

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
    stage === 'suggesting' &&
    !submittedText &&
    currentVentText.trim().length >= PERSONA_SUGGESTION_MIN_CHARS &&
    personaSuggestion &&
    currentSuggestionKey !== dismissedSuggestionKey
      ? personaSuggestion
      : null

  return (
    <div className="mx-auto h-full min-h-0 w-full max-w-[1360px]">
      {stage === 'selecting' ? (
        <section className="paper-texture paper-shadow relative flex h-full min-h-0 flex-col overflow-hidden rounded-[18px] border border-[#cbb79f]/25 px-4 py-5 sm:px-7 sm:py-6 lg:px-4">
            <span className="absolute left-[8%] top-[15%] h-2.5 w-2.5 rotate-45 rounded-[3px] bg-[#f1bec4]/55" />
            <span className="absolute right-[8%] top-[11%] h-2 w-2 rotate-12 rounded-full bg-[#efc4c8]/55" />
            <div className="mx-auto mb-3 max-w-2xl text-center">
              <p className="font-hand text-base text-[#947864]">Who would you like to hear today?</p>
              <h1 className="mt-0.5 font-hand text-3xl font-bold text-[#493a32] sm:text-4xl">Choose a personality</h1>
              <p className="mt-1 text-xs text-[#78685d] sm:text-sm">Each has a different way of seeing the world.</p>
            </div>
            <PersonalitySelector value={selectedPersonality} onValueChange={choosePersonality} variant="cards" className="mx-auto w-full max-w-[1120px] flex-1" />
            <div className="relative mt-2 flex justify-center">
              <button type="button" onClick={() => { setStage('suggesting'); setSuggestionError(null); setPersonaSuggestion(null) }} className="inline-flex h-10 items-center gap-2 rounded-full border border-[#d9c7b4]/55 bg-[#f7e9d6] px-4 text-xs font-semibold text-[#6b574b] shadow-[0_5px_12px_rgba(91,62,43,.08)] transition hover:-translate-y-0.5 hover:bg-[#fff5e7] sm:text-sm">
                <CircleHelp size={15} strokeWidth={1.8} /> Not sure? We&apos;ll help you choose. <ArrowRight size={14} />
              </button>
            </div>
            <Cat className="absolute bottom-3 right-5 text-[#a98c77]/45" size={34} strokeWidth={1.2} />
        </section>
      ) : stage === 'suggesting' ? (
        <section className="paper-shadow relative h-full min-h-0 overflow-hidden rounded-[18px] border border-[#c9b49c]/30 bg-[#33271f]">
          <Image src={heroArtwork} alt="A warm illustrated study for sharing a thought" fill priority className="object-cover object-center" sizes="(max-width: 1440px) 100vw, 1360px" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(32,21,16,.83),rgba(57,36,25,.6)_52%,rgba(32,21,16,.76)),radial-gradient(circle_at_48%_55%,transparent,rgba(24,14,10,.3))]" />
          <div className="absolute left-6 top-6 z-20 hidden w-48 -rotate-3 border border-[#c99d64] bg-[#f5dfad] p-4 text-[#624931] shadow-[0_10px_24px_rgba(16,10,8,.32)] lg:block">
            <span className="absolute left-1/2 top-0 h-5 w-20 -translate-x-1/2 -translate-y-2 rotate-2 bg-[#dfbd82]/70" />
            <p className="font-hand text-sm font-bold leading-5">We&apos;ll introduce you to someone who gets it.</p>
            <Cat className="ml-auto mt-2" size={21} strokeWidth={1.3} />
          </div>
          <button type="button" onClick={() => { setStage('selecting'); setSuggestionError(null); setPersonaSuggestion(null) }} className="absolute left-4 top-4 z-10 inline-flex h-9 items-center gap-1.5 rounded-full border border-white/20 bg-[#2d1f19]/40 px-3 text-xs font-medium text-white/90 backdrop-blur-sm transition hover:bg-white/15 lg:left-auto lg:right-4">
            <ArrowLeft size={14} /> Choose a voice
          </button>
          <div className="relative z-10 mx-auto flex h-full min-h-0 w-full max-w-[760px] items-center px-4 py-12 sm:px-8">
            <PersonaSuggestionInput
              value={currentVentText}
              suggestion={visibleSuggestion}
              error={suggestionError}
              isChecking={isCheckingSuggestion}
              onChange={changeSuggestionText}
              onRequestSuggestion={requestPersonaSuggestion}
              onUseSuggested={useSuggestedPersonality}
              variant="scene"
            />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between" aria-label="Five listening personalities are ready to help">
            <Image src={matchingCharactersLeft} alt="" className="h-auto w-[clamp(210px,25vw,360px)]" sizes="(max-width: 768px) 210px, 360px" />
            <Image src={matchingCharactersRight} alt="" className="h-auto w-[clamp(260px,32vw,450px)] translate-y-16" sizes="(max-width: 768px) 260px, 450px" />
          </div>
        </section>
      ) : stage === 'loading' && selectedPersonality ? (
        <section className="paper-shadow relative flex h-full min-h-0 items-center justify-center overflow-hidden rounded-[18px] border border-[#c9b49c]/30 bg-[#33271f]">
          <Image src={personalityLoadingScenes[selectedPersonality]} alt="" fill priority placeholder="blur" className="object-cover object-center" sizes="(max-width: 1440px) 100vw, 1360px" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(31,20,15,.54),rgba(46,30,22,.28)_50%,rgba(31,20,15,.52))]" />
          <div className="relative z-10 mx-auto max-w-md px-6 text-center text-[#fff4e4]">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-[#3d2b23]/35 text-2xl backdrop-blur-sm">{personalities[selectedPersonality].emoji}</span>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[.17em] text-white/75">Listening with {personalities[selectedPersonality].name}</p>
            <h1 className="mt-3 font-hand text-3xl font-bold leading-tight [text-shadow:0_2px_14px_rgba(25,14,9,.55)] sm:text-4xl">{loadingCopy[selectedPersonality].title}</h1>
            <p className="mt-3 text-sm leading-6 text-white/80">{loadingCopy[selectedPersonality].description}</p>
            <span className="mx-auto mt-7 flex w-fit items-center gap-1.5" aria-label="Loading">
              <i className="h-2 w-2 animate-bounce rounded-full bg-[#fff0d8] [animation-delay:-.2s]" />
              <i className="h-2 w-2 animate-bounce rounded-full bg-[#fff0d8] [animation-delay:-.1s]" />
              <i className="h-2 w-2 animate-bounce rounded-full bg-[#fff0d8]" />
            </span>
          </div>
        </section>
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
