'use client'

import { Check, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PersonaRouteResult } from '@/lib/ai/persona-router'
import { personalities, type PersonalityKey } from '@/lib/personalities'
import { cn } from '@/lib/utils'

interface WhyPersonaPanelProps {
  suggestion: PersonaRouteResult | null
  currentPersonality: PersonalityKey
  onUseSuggested: (personality: PersonalityKey) => void
  onKeepChoice: () => void
  className?: string
}

export function WhyPersonaPanel({
  suggestion,
  currentPersonality,
  onUseSuggested,
  onKeepChoice,
  className,
}: WhyPersonaPanelProps) {
  if (!suggestion) {
    return (
      <div className={cn('text-center text-sm leading-6 text-muted', className)}>
        Not sure who to choose? Start writing and Vent can suggest a lens.
      </div>
    )
  }

  const suggested = personalities[suggestion.suggestedPersona]
  const current = personalities[currentPersonality]

  return (
    <div
      className={cn(
        'glass-panel flex flex-col gap-4 rounded-[8px] p-4 text-left sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
      style={{
        borderColor: `color-mix(in srgb, ${suggested.accent} 42%, transparent)`,
        boxShadow: `0 0 46px ${suggested.glow}`,
      }}
    >
      <div className="min-w-0">
        <div className="mb-1 inline-flex items-center gap-2 text-xs font-medium" style={{ color: suggested.accent }}>
          <Sparkles size={14} strokeWidth={1.8} aria-hidden="true" />
          Suggested lens
        </div>
        <p className="font-display text-xl font-medium text-foreground">Suggested: {suggested.name}</p>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
          {suggestion.reason} You can ignore this and stay with {current.name}.
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => onUseSuggested(suggestion.suggestedPersona)}
          style={{
            backgroundColor: suggested.accent,
            boxShadow: `0 0 28px ${suggested.glow}`,
          }}
        >
          <Check size={15} aria-hidden="true" />
          Use {suggested.name}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onKeepChoice}
          style={{
            borderColor: `color-mix(in srgb, ${suggested.accent} 40%, transparent)`,
          }}
        >
          <X size={15} aria-hidden="true" />
          Keep my choice
        </Button>
      </div>
    </div>
  )
}
