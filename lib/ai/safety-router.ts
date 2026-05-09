import { AI_MODEL, groq } from '@/lib/ai'
import type { PersonalityId } from '@/lib/ai/persona-router'

export type SafetyLevel = 'normal' | 'elevated_distress' | 'urgent_safety'

export type SafetyRouteResult = {
  level: SafetyLevel
  shouldOverridePersona: boolean
  saferPersona?: PersonalityId
  userFacingNote?: string
  internalReason: string
}

type SafetyClassifierResult = {
  level: SafetyLevel
  internalReason: string
  saferPersona: 'cotton' | 'angel' | null
}

const levelRank: Record<SafetyLevel, number> = {
  normal: 0,
  elevated_distress: 1,
  urgent_safety: 2,
}

const urgentPatterns = [
  /\b(kill|hurt|harm)\s+myself\b/i,
  /\b(end|take)\s+my\s+life\b/i,
  /\bsuicid(?:e|al)\b/i,
  /\bself[-\s]?harm\b/i,
  /\bi\s*(?:am|'m)?\s*(?:going to|gonna|about to)\s+(?:hurt|harm|kill)\b/i,
  /\b(?:hurt|harm|kill)\s+someone\b/i,
  /\bnot\s+safe\s+right\s+now\b/i,
  /\bcan(?:'|no)t\s+keep\s+myself\s+safe\b/i,
  /\bimmediate\s+danger\b/i,
  /\bi\s+have\s+a\s+plan\b/i,
  /\bthis\s+is\s+my\s+(?:final|last)\s+(?:message|note|goodbye)\b/i,
  /\bsaying\s+goodbye\b/i,
]

const elevatedPatterns = [
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

const angelPatterns = [
  /\b(?:worthless|not\s+enough|hate\s+myself|ashamed|unlovable|failure)\b/i,
  /\b(?:confidence|insecure|self[-\s]?doubt)\b/i,
]

function chooseSaferPersona(message: string): 'cotton' | 'angel' {
  return angelPatterns.some((pattern) => pattern.test(message)) ? 'angel' : 'cotton'
}

function localSafetyRoute(message: string, selectedPersona: PersonalityId): SafetyRouteResult {
  const saferPersona = chooseSaferPersona(message)
  const alreadyGentle = selectedPersona === 'cotton' || selectedPersona === 'angel'

  if (urgentPatterns.some((pattern) => pattern.test(message))) {
    return {
      level: 'urgent_safety',
      shouldOverridePersona: !alreadyGentle,
      saferPersona: alreadyGentle ? undefined : saferPersona,
      userFacingNote: alreadyGentle ? undefined : 'Switched to a gentler response for this one.',
      internalReason: 'Local safety heuristic found language suggesting possible immediate danger.',
    }
  }

  if (elevatedPatterns.some((pattern) => pattern.test(message))) {
    const shouldOverridePersona = selectedPersona === 'auntie-zhang'

    return {
      level: 'elevated_distress',
      shouldOverridePersona,
      saferPersona: shouldOverridePersona ? saferPersona : undefined,
      userFacingNote: shouldOverridePersona ? 'Switched to a gentler response for this one.' : undefined,
      internalReason: 'Local safety heuristic found intense distress without a stated immediate danger.',
    }
  }

  return {
    level: 'normal',
    shouldOverridePersona: false,
    internalReason: 'No safety-routing concern found by local heuristic.',
  }
}

function extractJson(text: string) {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return fenced?.[1] ?? trimmed
}

function isSafetyLevel(value: unknown): value is SafetyLevel {
  return value === 'normal' || value === 'elevated_distress' || value === 'urgent_safety'
}

function parseClassifierResult(text: string): SafetyClassifierResult | null {
  try {
    const parsed = JSON.parse(extractJson(text)) as Partial<SafetyClassifierResult>
    const saferPersona = parsed.saferPersona === 'cotton' || parsed.saferPersona === 'angel' ? parsed.saferPersona : null

    if (!isSafetyLevel(parsed.level)) return null

    return {
      level: parsed.level,
      internalReason:
        typeof parsed.internalReason === 'string' && parsed.internalReason.trim()
          ? parsed.internalReason.trim().slice(0, 180)
          : 'Groq safety classifier returned a structured level.',
      saferPersona,
    }
  } catch {
    return null
  }
}

function routeFromLevel(level: SafetyLevel, selectedPersona: PersonalityId, saferPersona: 'cotton' | 'angel'): SafetyRouteResult {
  if (level === 'urgent_safety') {
    const alreadyGentle = selectedPersona === 'cotton' || selectedPersona === 'angel'

    return {
      level,
      shouldOverridePersona: !alreadyGentle,
      saferPersona: alreadyGentle ? undefined : saferPersona,
      userFacingNote: alreadyGentle ? undefined : 'Switched to a gentler response for this one.',
      internalReason: 'Safety classifier selected urgent_safety.',
    }
  }

  if (level === 'elevated_distress') {
    const shouldOverridePersona = selectedPersona === 'auntie-zhang'

    return {
      level,
      shouldOverridePersona,
      saferPersona: shouldOverridePersona ? saferPersona : undefined,
      userFacingNote: shouldOverridePersona ? 'Switched to a gentler response for this one.' : undefined,
      internalReason: 'Safety classifier selected elevated_distress.',
    }
  }

  return {
    level: 'normal',
    shouldOverridePersona: false,
    internalReason: 'Safety classifier selected normal.',
  }
}

export async function routeSafety(params: {
  message: string
  selectedPersona: PersonalityId
}): Promise<SafetyRouteResult> {
  const localRoute = localSafetyRoute(params.message, params.selectedPersona)

  if (!groq) {
    return localRoute
  }

  try {
    const completion = await groq.chat.completions.create({
      model: AI_MODEL,
      temperature: 0,
      max_tokens: 120,
      messages: [
        {
          role: 'system',
          content: `Return JSON only.
Classify the user message for response-safety routing. This is not diagnosis.
Levels:
normal: ordinary venting, frustration, sadness, stress, anger, insecurity
elevated_distress: intense distress, hopelessness, feeling unable to cope, severe panic, but no immediate danger stated
urgent_safety: user suggests they may be in immediate danger or may harm themselves or someone else
Return:
{
  "level": "normal" | "elevated_distress" | "urgent_safety",
  "internalReason": "brief reason without quoting graphic detail",
  "saferPersona": "cotton" | "angel" | null
}`,
        },
        {
          role: 'user',
          content: params.message,
        },
      ],
    })

    const classifierResult = parseClassifierResult(completion.choices[0]?.message?.content ?? '')
    if (!classifierResult) return localRoute

    const saferPersona = classifierResult.saferPersona ?? chooseSaferPersona(params.message)
    const saferLevel =
      levelRank[classifierResult.level] > levelRank[localRoute.level] ? classifierResult.level : localRoute.level
    const result = routeFromLevel(saferLevel, params.selectedPersona, saferPersona)

    return {
      ...result,
      internalReason:
        levelRank[classifierResult.level] > levelRank[localRoute.level]
          ? classifierResult.internalReason
          : localRoute.internalReason,
    }
  } catch (error) {
    console.error('Safety routing classifier failed', error)
    return localRoute
  }
}
