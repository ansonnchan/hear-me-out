'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { PersonalitySelector } from '@/components/personality-selector'
import { QuoteDisplay } from '@/components/quote-display'
import { ResponsePanel } from '@/components/response-panel'
import { VentInput } from '@/components/vent-input'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useVentStore } from '@/store/vent-store'

export default function HomePage() {
  const resetSession = useVentStore((state) => state.resetSession)
  const [ventText, setVentText] = useState('')
  const [submittedText, setSubmittedText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [generationKey, setGenerationKey] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    if (!supabase) return

    supabase.auth.getUser().then(({ data }) => setIsLoggedIn(Boolean(data.user)))
  }, [])

  function submit() {
    const trimmed = ventText.trim()

    if (!trimmed) {
      setError('Write something first. Even one sentence.')
      return
    }

    setError(null)
    resetSession()
    setSubmittedText(trimmed)
    setGenerationKey((key) => key + 1)
  }

  return (
    <div className="pb-12">
      <section className="mx-auto max-w-4xl pt-10 sm:pt-16">
        <div className="mb-8 space-y-4 text-center">
          <p className="text-sm text-[var(--accent)]">Same thought, different lens.</p>
          <h1 className="text-balance font-display text-5xl font-medium leading-tight sm:text-6xl">
            Not a therapist. Just a listener.
          </h1>
          <p className="text-lg text-muted">Five ways to hear yourself think.</p>
        </div>

        <QuoteDisplay />

        <div className="space-y-5">
          <PersonalitySelector />
          <VentInput
            value={ventText}
            onChange={setVentText}
            onSubmit={submit}
            isLoading={isGenerating}
            error={error}
          />
        </div>

        {isLoggedIn ? (
          <div className="mt-6 flex justify-center">
            <Link
              href="/history"
              className="inline-flex items-center gap-2 text-sm text-muted transition-colors duration-300 hover:text-foreground"
            >
              Recent sessions
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        ) : null}
      </section>

      {submittedText ? (
        <ResponsePanel
          key={generationKey}
          originalText={submittedText}
          autoGenerateKey={generationKey}
          onGeneratingChange={setIsGenerating}
          className="mx-auto mt-12 max-w-4xl"
        />
      ) : null}
    </div>
  )
}

