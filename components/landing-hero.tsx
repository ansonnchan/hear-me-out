'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createSupabaseBrowserClient, hasSupabaseConfig } from '@/lib/supabase/client'

export function LandingHero() {
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [hasCheckedAuth, setHasCheckedAuth] = useState(() => !hasSupabaseConfig())

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    if (!supabase) return

    supabase.auth.getUser().then(({ data }) => {
      setIsSignedIn(Boolean(data.user))
      setHasCheckedAuth(true)
    })
  }, [])

  return (
    <section className="mx-auto grid max-w-5xl gap-10 pt-10 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
      <div className="space-y-7">
        <div className="space-y-4">
          <p className="text-sm text-[var(--accent)]">Same thought, different lens.</p>
          <h1 className="text-balance font-display text-5xl font-medium leading-tight sm:text-6xl">
            Not a therapist. Just a listener.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-muted">
            Write what is too tangled to hold alone. Hear it back through a voice that meets the moment.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button asChild variant="primary" size="lg">
            <Link href="/vent">
              Let it out
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </Button>

          <div className="flex items-center gap-2 text-sm text-muted">
            <Link className="rounded-full px-3 py-2 transition-colors duration-300 hover:text-foreground" href="/history">
              History
            </Link>
            <Link className="rounded-full px-3 py-2 transition-colors duration-300 hover:text-foreground" href="/profile">
              Profile
            </Link>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-[8px] p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface-strong)] text-[var(--accent)]">
            <UserRound size={18} aria-hidden="true" />
          </span>
          <div>
            <p className="font-display text-2xl font-medium">
              {hasCheckedAuth && isSignedIn ? 'Welcome back' : 'Welcome'}
            </p>
            <p className="text-sm text-muted">A quiet place to begin again.</p>
          </div>
        </div>

        {hasCheckedAuth && isSignedIn ? (
          <p className="text-base leading-7 text-foreground/72">
            Your saved sessions are still here. Start fresh, or return to the thoughts you left breathing.
          </p>
        ) : (
          <div className="space-y-5">
            <p className="text-base leading-7 text-foreground/72">
              You can write without signing in. Save your sessions when you want a trail back to them.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="secondary" size="sm">
                <Link href="/profile">Sign in</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/profile">Sign up</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
