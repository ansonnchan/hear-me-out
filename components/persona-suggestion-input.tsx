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
  variant?: 'panel' | 'scene'
}

export function PersonaSuggestionInput({ value, suggestion, error, isChecking = false, onChange, onRequestSuggestion, onUseSuggested, className, variant = 'panel' }: PersonaSuggestionInputProps) {
  const isScene = variant === 'scene'
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey) return
    event.preventDefault()
    onRequestSuggestion()
  }

  return (
    <div className={cn(
      'paper-shadow relative mx-auto flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[18px] border p-4 text-left text-[#fff8ec] sm:p-5',
      isScene ? 'border-white/15 bg-[#2d1f19]/55 p-5 backdrop-blur-[3px] sm:p-7' : 'border-[#c9b49c]/30 bg-[#33271f]',
      className,
    )}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(191,145,100,.18),transparent_35%),linear-gradient(135deg,rgba(80,56,40,.25),transparent)]" />
      <div className={cn('relative mb-3 flex items-start gap-3', isScene && 'mx-auto max-w-xl flex-col items-center text-center')}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-[#d7b8f2]"><Sparkles size={17} /></span>
        <div>
          <h2 className={cn('font-hand text-2xl font-bold sm:text-[26px]', isScene && 'text-3xl sm:text-4xl')}>Not sure who to talk to?</h2>
          <p className="mt-0.5 text-xs leading-5 text-white/65 sm:text-sm">Write a little about how you feel. We&apos;ll suggest a perspective that might help.</p>
        </div>
      </div>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="For example: I feel behind even though I’m trying my best..."
        className={cn('relative w-full shrink-0 resize-none rounded-[10px] border border-[#ddc2a1]/65 bg-[#fff7e8] px-5 py-3 text-sm leading-6 text-[#55483e] outline-none placeholder:font-hand placeholder:text-[#9e8a7a] focus:border-[#9e88bf] focus:shadow-[0_8px_24px_rgba(0,0,0,.15)]', isScene ? 'h-[clamp(124px,19vh,180px)]' : 'h-[clamp(92px,14vh,132px)]')}
      />

      <div className="relative mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-5 text-xs text-white/48">{error ? <span className="text-[#e2b8d0]">{error}</span> : <span>Your words stay in this session.</span>}</div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="text-xs text-white/45">{value.length.toLocaleString()}</span>
          <Button type="button" size="md" variant="primary" className="bg-[#9e88bf] text-white hover:bg-[#8b75aa]" onClick={onRequestSuggestion} disabled={isChecking}>
            <Sparkles size={15} aria-hidden="true" />
            {isChecking ? 'Finding a voice...' : 'Suggest a voice'}
          </Button>
        </div>
      </div>

      {suggestion ? <WhyPersonaPanel suggestion={suggestion} onUseSuggested={onUseSuggested} className="mt-3" /> : null}
    </div>
  )
}
