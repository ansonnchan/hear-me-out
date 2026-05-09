'use client'

import type { PersonaRouteResult } from '@/lib/ai/persona-router'
import type { PersonalityKey } from '@/lib/personalities'
import { cn } from '@/lib/utils'
import { WhyPersonaPanel } from '@/components/why-persona-panel'

interface PersonaSuggestionInputProps {
  value: string
  suggestion: PersonaRouteResult | null
  currentPersonality: PersonalityKey
  onChange: (value: string) => void
  onUseSuggested: (personality: PersonalityKey) => void
  onKeepChoice: () => void
  className?: string
}

export function PersonaSuggestionInput({
  value,
  suggestion,
  currentPersonality,
  onChange,
  onUseSuggested,
  onKeepChoice,
  className,
}: PersonaSuggestionInputProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-3xl rounded-[8px] border border-[rgba(245,158,11,0.34)] bg-[rgba(245,158,11,0.055)] p-4 text-left shadow-[0_0_42px_rgba(245,158,11,0.08)]',
        className,
      )}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[rgba(245,158,11,0.42)] px-2 py-0.5 text-xs text-[#FBBF24]">
          New
        </span>
        <p className="text-sm text-foreground/78">
          Try our new feature: Vent can suggest a lens from what you write.
        </p>
      </div>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Write a sentence about your mood or situation. You can keep it short."
        className="h-28 w-full resize-none rounded-[8px] border border-[var(--color-border)] bg-[rgba(255,255,255,0.035)] px-4 py-3 text-base leading-7 text-foreground outline-none placeholder:text-foreground/28 focus:border-[#FBBF24] focus:shadow-[0_0_28px_rgba(245,158,11,0.12)]"
      />

      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted">
        <span>Manual choice still works above.</span>
        <span>{value.length.toLocaleString()}</span>
      </div>

      {suggestion ? (
        <WhyPersonaPanel
          suggestion={suggestion}
          currentPersonality={currentPersonality}
          onUseSuggested={onUseSuggested}
          onKeepChoice={onKeepChoice}
          className="mt-4"
        />
      ) : (
        <p className="mt-4 text-center text-sm text-muted">
          Not sure who to choose? Start writing and Vent can suggest a lens.
        </p>
      )}
    </div>
  )
}
