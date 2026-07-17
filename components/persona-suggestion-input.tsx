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

export function PersonaSuggestionInput({ value, suggestion, error, isChecking = false, onChange, onRequestSuggestion, onUseSuggested, className }: PersonaSuggestionInputProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey) return
    event.preventDefault()
    onRequestSuggestion()
  }

  return (
    <div className={cn('paper-shadow relative mx-auto w-full overflow-hidden rounded-[18px] border border-[#c9b49c]/30 bg-[#33271f] p-5 text-left text-[#fff8ec] sm:p-8', className)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(191,145,100,.18),transparent_35%),linear-gradient(135deg,rgba(80,56,40,.25),transparent)]" />
      <div className="relative mb-5 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-[#d7b8f2]"><Sparkles size={18} /></span>
        <div>
          <h2 className="font-hand text-3xl font-bold">Not sure who to talk to?</h2>
          <p className="mt-1 text-sm leading-6 text-white/65">Write a little about how you feel. We&apos;ll suggest a perspective that might help.</p>
        </div>
      </div>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="For example: I feel behind even though I’m trying my best..."
        className="relative h-36 w-full resize-none rounded-[10px] border border-[#ddc2a1]/65 bg-[#fff7e8] px-5 py-4 text-sm leading-6 text-[#55483e] outline-none placeholder:font-hand placeholder:text-[#9e8a7a] focus:border-[#aa8ad8] focus:shadow-[0_8px_24px_rgba(0,0,0,.15)]"
      />

      <div className="relative mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-5 text-xs text-white/48">{error ? <span className="text-[#e2b8d0]">{error}</span> : <span>Your words stay in this session.</span>}</div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="text-xs text-white/45">{value.length.toLocaleString()}</span>
          <Button type="button" size="md" variant="primary" className="bg-[#aa8ad8] text-white hover:bg-[#9876ca]" onClick={onRequestSuggestion} disabled={isChecking}>
            <Sparkles size={15} aria-hidden="true" />
            {isChecking ? 'Finding a voice...' : 'Suggest a voice'}
          </Button>
        </div>
      </div>

      {suggestion ? <WhyPersonaPanel suggestion={suggestion} onUseSuggested={onUseSuggested} className="mt-5" /> : null}
    </div>
  )
}
