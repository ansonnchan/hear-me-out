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
      isScene ? 'border-transparent bg-transparent p-0 shadow-none' : 'border-[#c9b49c]/30 bg-[#33271f]',
      className,
    )}>
      {!isScene ? <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(191,145,100,.18),transparent_35%),linear-gradient(135deg,rgba(80,56,40,.25),transparent)]" /> : null}
      <div className={cn('relative mb-3 flex items-start gap-3', isScene && 'mx-auto mb-5 max-w-xl flex-col items-center text-center')}>
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-[#d7b8f2]', isScene && 'h-10 w-10 rounded-full border-white/20 bg-white/10')}><Sparkles size={17} /></span>
        <div>
          <h2 className={cn('font-hand text-2xl font-bold sm:text-[26px]', isScene && 'text-3xl text-[#fff3df] [text-shadow:0_2px_12px_rgba(26,15,10,.5)] sm:text-4xl')}>Not sure who to talk to?</h2>
          <p className={cn('mt-0.5 text-xs leading-5 text-white/65 sm:text-sm', isScene && 'text-[#fff1df]/80')}>Write a little about how you feel. We&apos;ll suggest a perspective that might help.</p>
        </div>
      </div>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="For example: I feel behind even though I’m trying my best..."
        className={cn('relative w-full shrink-0 resize-none rounded-[10px] border border-[#ddc2a1]/65 bg-[#fff7e8] px-5 py-3 text-sm leading-6 text-[#55483e] outline-none placeholder:font-hand placeholder:text-[#9e8a7a] focus:border-[#9e88bf] focus:shadow-[0_8px_24px_rgba(0,0,0,.15)]', isScene ? 'h-[clamp(124px,19vh,180px)] rounded-[15px] border-[3px] border-[#e5bd8c]/85 bg-[#fff8e9] px-6 py-4 shadow-[0_10px_28px_rgba(26,15,10,.27)]' : 'h-[clamp(92px,14vh,132px)]')}
      />

      <div className="relative mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className={cn('min-h-5 text-xs text-white/48', isScene && 'text-[#fff1df]/75')}>{error ? <span className="text-[#e2b8d0]">{error}</span> : <span>Your words stay in this session.</span>}</div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className={cn('text-xs text-white/45', isScene && 'text-[#fff1df]/65')}>{value.length.toLocaleString()}</span>
          <Button type="button" size="md" variant="primary" className="bg-[#9e88bf] text-white shadow-[0_7px_18px_rgba(34,19,42,.26)] hover:bg-[#8b75aa]" onClick={onRequestSuggestion} disabled={isChecking}>
            <Sparkles size={15} aria-hidden="true" />
            {isChecking ? 'Finding a voice...' : 'Suggest a voice'}
          </Button>
        </div>
      </div>

      {suggestion ? <WhyPersonaPanel suggestion={suggestion} onUseSuggested={onUseSuggested} className="mt-3" /> : null}
    </div>
  )
}
