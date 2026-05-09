export type PersonalityId =
  | 'cotton'
  | 'aristotle'
  | 'venerable-ming'
  | 'angel'
  | 'auntie-zhang'

export type PersonaRouteResult = {
  suggestedPersona: PersonalityId
  confidence: number
  reason: string
  alternatives: Array<{
    persona: PersonalityId
    score: number
    reason: string
  }>
}

type WeightedPhraseGroup = {
  weight: number
  phrases: string[]
}

type PersonaProfile = {
  reason: string
  fallbackReason: string
  groups: WeightedPhraseGroup[]
}

const personaProfiles: Record<PersonalityId, PersonaProfile> = {
  cotton: {
    reason: 'Your message sounds like it may need comfort, room, and a softer place to land.',
    fallbackReason: 'Cotton is a gentle default when you just need room to vent.',
    groups: [
      {
        weight: 5,
        phrases: [
          'i just need to vent',
          'need to vent',
          'so overwhelmed',
          'feel overwhelmed',
          'burned out',
          'burnt out',
          'i do not want advice',
          'i don\'t want advice',
          'i need comfort',
        ],
      },
      {
        weight: 4,
        phrases: ['sad', 'lonely', 'alone', 'tired', 'exhausted', 'crying', 'heavy', 'hurt', 'drained', 'numb', 'grief', 'grieving'],
      },
      {
        weight: 3,
        phrases: ['comfort', 'listen', 'hold', 'soft', 'rough day', 'bad day', 'too much', 'be gentle', 'need kindness'],
      },
    ],
  },
  aristotle: {
    reason: 'Your message seems to need clarity, tradeoffs, and a practical next step.',
    fallbackReason: 'Aristotle can help when the shape of the problem is unclear.',
    groups: [
      {
        weight: 5,
        phrases: [
          'what should i do',
          'what do i do',
          'should i',
          'pros and cons',
          'tradeoff',
          'tradeoffs',
          'help me decide',
          'i need clarity',
        ],
      },
      {
        weight: 4,
        phrases: ['decision', 'decide', 'confused', 'plan', 'planning', 'choice', 'options', 'next step', 'strategy', 'prioritize'],
      },
      {
        weight: 3,
        phrases: ['logic', 'rational', 'clarity', 'clear', 'figure out', 'stuck between', 'make sense', 'analyze', 'problem'],
      },
    ],
  },
  'venerable-ming': {
    reason: 'This lens may help because your vent seems focused on overthinking, perspective, or letting go.',
    fallbackReason: 'Venerable Ming can help when the mind needs space around a thought.',
    groups: [
      {
        weight: 5,
        phrases: [
          'can\'t stop thinking',
          'cannot stop thinking',
          'spiraling',
          'overthinking',
          'looping in my head',
          'can\'t let it go',
          'cannot let it go',
        ],
      },
      {
        weight: 4,
        phrases: ['let go', 'letting go', 'accept', 'acceptance', 'detach', 'detachment', 'perspective', 'peace', 'control'],
      },
      {
        weight: 3,
        phrases: ['ruminating', 'stuck in my head', 'not in my control', 'out of my control', 'mind racing', 'obsessing', 'quiet my mind'],
      },
    ],
  },
  angel: {
    reason: 'Your message sounds like it may need reassurance, encouragement, and someone in your corner.',
    fallbackReason: 'Angel can help when the tender part is self-belief.',
    groups: [
      {
        weight: 5,
        phrases: ['not enough', 'i am not enough', 'i\'m not enough', 'hate myself', 'feel worthless', 'i am a failure', 'i\'m a failure'],
      },
      {
        weight: 4,
        phrases: ['insecure', 'self doubt', 'self-doubt', 'confidence', 'reassurance', 'failure', 'ashamed', 'embarrassed'],
      },
      {
        weight: 3,
        phrases: ['believe in me', 'encourage me', 'proud of me', 'unlovable', 'imposter', 'impostor', 'am i bad', 'need encouragement'],
      },
    ],
  },
  'auntie-zhang': {
    reason: 'This lens may fit because your vent points toward accountability, momentum, and clean action.',
    fallbackReason: 'Auntie Zhang is useful when kindness needs a backbone.',
    groups: [
      {
        weight: 5,
        phrases: [
          'procrastinating',
          'procrastination',
          'making excuses',
          'need discipline',
          'hold me accountable',
          'stop avoiding',
        ],
      },
      {
        weight: 4,
        phrases: ['lazy', 'avoidance', 'avoiding', 'productive', 'productivity', 'deadline', 'get it done', 'scrolling', 'study'],
      },
      {
        weight: 3,
        phrases: ['tough love', 'no excuses', 'motivate me', 'focus', 'habit', 'routine', 'wasting time', 'chores', 'workout'],
      },
    ],
  },
}

const personaOrder: PersonalityId[] = ['cotton', 'aristotle', 'venerable-ming', 'angel', 'auntie-zhang']

function normalizeText(text: string) {
  return ` ${text.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[^a-z0-9'\s-]/g, ' ').replace(/\s+/g, ' ').trim()} `
}

function phraseScore(normalizedText: string, phrase: string) {
  const normalizedPhrase = normalizeText(phrase).trim()
  if (!normalizedPhrase) return 0

  if (normalizedPhrase.includes(' ') || normalizedPhrase.includes('-') || normalizedPhrase.includes("'")) {
    return normalizedText.includes(` ${normalizedPhrase} `) ? 1 : 0
  }

  const matches = normalizedText.match(new RegExp(`\\b${normalizedPhrase}\\b`, 'g'))
  return matches?.length ?? 0
}

function scorePersona(normalizedText: string, profile: PersonaProfile) {
  return profile.groups.reduce((total, group) => {
    const groupHits = group.phrases.reduce((hits, phrase) => hits + phraseScore(normalizedText, phrase), 0)
    return total + groupHits * group.weight
  }, 0)
}

function roundScore(score: number) {
  return Math.round(score * 100) / 100
}

export function routePersona(message: string): PersonaRouteResult {
  const normalizedText = normalizeText(message)
  const rawScores = personaOrder.map((persona) => ({
    persona,
    rawScore: scorePersona(normalizedText, personaProfiles[persona]),
  }))
  const totalScore = rawScores.reduce((total, item) => total + item.rawScore, 0)

  if (totalScore <= 0) {
    return {
      suggestedPersona: 'cotton',
      confidence: 0.35,
      reason: personaProfiles.cotton.fallbackReason,
      alternatives: personaOrder
        .filter((persona) => persona !== 'cotton')
        .slice(0, 3)
        .map((persona) => ({
          persona,
          score: 0.16,
          reason: personaProfiles[persona].fallbackReason,
        })),
    }
  }

  const normalizedScores = rawScores
    .map((item) => ({
      persona: item.persona,
      score: item.rawScore / totalScore,
    }))
    .sort((a, b) => b.score - a.score)

  const top = normalizedScores[0]

  return {
    suggestedPersona: top.persona,
    confidence: roundScore(Math.max(top.score, 0.42)),
    reason: personaProfiles[top.persona].reason,
    alternatives: normalizedScores
      .filter((item) => item.persona !== top.persona)
      .slice(0, 3)
      .map((item) => ({
        persona: item.persona,
        score: roundScore(item.score),
        reason: personaProfiles[item.persona].reason,
      })),
  }
}
