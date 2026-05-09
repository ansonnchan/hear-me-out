'use client'

import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PersonaRouteResult } from '@/lib/ai/persona-router'
import { personalities } from '@/lib/personalities'
import { cn } from '@/lib/utils'

interface WhyPersonaPanelProps {
  suggestion: PersonaRouteResult | null
  onUseSuggested: () => void
  className?: string
}

export function WhyPersonaPanel({
  suggestion,
  onUseSuggested,
  className,
}: WhyPersonaPanelProps) {
  if (!suggestion) {
    return (
      <div className={cn('text-center text-sm leading-6 text-muted', className)}>
        Not sure who to choose? Write a little and vent.ai can suggest a lens.
      </div>
    )
  }

  const suggested = personalities[suggestion.suggestedPersona]

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
          {suggestion.reason}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={onUseSuggested}
          style={{
            backgroundColor: suggested.accent,
            boxShadow: `0 0 28px ${suggested.glow}`,
          }}
        >
          <ArrowRight size={15} aria-hidden="true" />
          Switch to {suggested.name}
        </Button>
      </div>
    </div>
  )
}
