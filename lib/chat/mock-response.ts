import type { SafetyLevel } from '@/lib/ai/safety-router'
import { personalities, type PersonalityKey } from '@/lib/personalities'

export function mockResponse(personality: PersonalityKey, safetyLevel: SafetyLevel) {
  if (safetyLevel === 'urgent_safety') {
    return 'I am really glad you wrote this down instead of carrying it alone. If you may be in immediate danger, please contact local emergency services or someone you trust right now, and keep your next step very small and safe. You do not have to solve the whole night at once; you only need to get through this next moment with support nearby.'
  }

  const copy: Record<PersonalityKey, string> = {
    cotton: 'Let it be messy for a moment. You do not have to make it smaller before it is allowed to be held. I am here with the feeling first, before advice, before cleanup, before anyone asks you to be easier to understand.',
    aristotle: 'The first useful move is to separate the feeling from the question. Something in this matters to you, and something in it feels uncertain. Stay with the central issue, then take the next small step that reduces confusion rather than trying to solve the whole knot at once.',
    'venerable-ming': 'Let the mind set down what it has been carrying. Not everything asks to be solved tonight. A journey of a thousand miles begins with a single step, and sometimes the first step is simply seeing the ground beneath you again.',
    angel: 'I want you to notice that you are still trying to name the truth instead of abandoning yourself inside it. That matters. Whatever this day has asked of you, you are not weak for needing tenderness around it.',
    'auntie-zhang': 'Be honest with yourself, but do not be cruel. The next move does not need drama. Choose one concrete action you can stand behind, do it cleanly, and let that prove to you that you are not as stuck as the feeling says.',
  }

  return copy[personality] ?? `${personalities[personality].name} is listening. Give the thought a little more room.`
}

export async function* streamMockResponse(text: string) {
  for (const chunk of text.split(/(\s+)/)) yield chunk
}
