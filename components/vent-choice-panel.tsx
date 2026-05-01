'use client'

import { History, PenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface VentChoicePanelProps {
  onStartNew: () => void
  onContinuePrevious: () => void
}

export function VentChoicePanel({ onStartNew, onContinuePrevious }: VentChoicePanelProps) {
  return (
    <section className="mx-auto max-w-3xl py-16">
      <div className="mb-9 space-y-4 text-center">
        <p className="text-sm text-[var(--accent)]">Begin where you are.</p>
        <h1 className="text-balance font-display text-5xl font-medium leading-tight">
          What would help right now?
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={onStartNew}
          className="glass-panel group rounded-[8px] p-6 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--accent)_36%,transparent)] hover:shadow-lift"
        >
          <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-surface-strong)] text-[var(--accent)]">
            <PenLine size={18} aria-hidden="true" />
          </span>
          <span className="block font-display text-3xl font-medium">Start a new vent</span>
          <span className="mt-3 block text-sm leading-6 text-muted">
            A blank page. A chosen voice. Enough room to let the first sentence arrive.
          </span>
        </button>

        <button
          type="button"
          onClick={onContinuePrevious}
          className="glass-panel group rounded-[8px] p-6 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--accent)_36%,transparent)] hover:shadow-lift"
        >
          <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-surface-strong)] text-[var(--accent)]">
            <History size={18} aria-hidden="true" />
          </span>
          <span className="block font-display text-3xl font-medium">Continue previous vent</span>
          <span className="mt-3 block text-sm leading-6 text-muted">
            Return to what you saved. Some thoughts ask to be heard more than once.
          </span>
        </button>
      </div>

      <div className="mt-8 flex justify-center">
        <Button type="button" variant="primary" onClick={onStartNew}>
          Let it out
        </Button>
      </div>
    </section>
  )
}
