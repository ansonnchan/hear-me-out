'use client'

import { KeyboardEvent } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WhyPersonaPanel } from '@/components/why-persona-panel'
import type { PersonaRouteResult } from '@/lib/ai/persona-router'
import { cn } from '@/lib/utils'

interface PersonaSuggestionInputProps {
  value: string
  suggestion: PersonaRouteResult | null
  error?: string | null
  isChecking?: boolean
  onChange: (value: string) => void
  onRequestSuggestion: () => void
  onUseSuggested: () => void
  className?: string
}

export function PersonaSuggestionInput({
  value,
  suggestion,
  error,
  isChecking = false,
  onChange,
  onRequestSuggestion,
  onUseSuggested,
  className,
}: PersonaSuggestionInputProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey) return

    event.preventDefault()
    onRequestSuggestion()
  }

  return (
    <div
      className={cn(
        'mx-auto w-full max-w-3xl rounded-[8px] border border-[rgba(159,213,196,0.34)] bg-[rgba(159,213,196,0.045)] p-4 text-left shadow-[0_0_42px_rgba(159,213,196,0.08)]',
        className,
      )}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[rgba(159,213,196,0.42)] px-2 py-0.5 text-xs text-[#9FD5C4]">
          New
        </span>
        <p className="text-sm text-foreground/78">
          Try our new feature: vent.ai can suggest a personality from what you write.
        </p>
      </div>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write a sentence about your mood or situation, then press Suggest Lens."
        className="h-28 w-full resize-none rounded-[8px] border border-[var(--color-border)] bg-[rgba(255,255,255,0.035)] px-4 py-3 text-base leading-7 text-foreground outline-none placeholder:text-foreground/28 focus:border-[#9FD5C4] focus:shadow-[0_0_28px_rgba(159,213,196,0.12)]"
      />

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-5 text-xs text-muted">
          {error ? <span className="text-[#9FD5C4]">{error}</span> : <span>Manual choice still works above.</span>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">{value.length.toLocaleString()}</span>
          <Button type="button" size="sm" variant="secondary" onClick={onRequestSuggestion} disabled={isChecking}>
            <Sparkles size={15} aria-hidden="true" />
            {isChecking ? 'Checking...' : 'Suggest lens'}
          </Button>
        </div>
      </div>

      {suggestion ? (
        <WhyPersonaPanel suggestion={suggestion} onUseSuggested={onUseSuggested} className="mt-4" />
      ) : (
        <p className="mt-4 text-center text-sm text-muted">
          Not sure who to choose? Press <strong>Suggest Lens</strong> and vent.ai can suggest a personality.
        </p>
      )}
    </div>
  )
}
