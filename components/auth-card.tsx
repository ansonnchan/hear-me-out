'use client'

import { FormEvent, useState } from 'react'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

interface AuthCardProps {
  message?: string
}

export function AuthCard({ message = 'Sign in to save your sessions.' }: AuthCardProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus(null)

    if (!email.trim()) {
      setStatus('Add your email first.')
      return
    }

    const supabase = createSupabaseBrowserClient()
    if (!supabase) {
      setStatus('Saving needs Supabase keys first.')
      return
    }

    setIsLoading(true)
    const origin = window.location.origin
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`,
      },
    })
    setIsLoading(false)

    setStatus(error ? 'Something went quiet. Try again in a moment.' : 'Check your inbox. The door is open from there.')
  }

  return (
    <section className="mx-auto max-w-xl py-20">
      <div className="glass-panel rounded-[8px] p-7 sm:p-9">
        <div className="space-y-3">
          <p className="text-sm text-[var(--accent)]">{message}</p>
          <h1 className="font-display text-4xl font-medium">A quiet place, kept for you.</h1>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="grid gap-2 text-sm text-muted">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="h-12 rounded-[8px] border border-[var(--color-border)] bg-[rgba(255,255,255,0.04)] px-4 text-foreground outline-none transition-all duration-300 placeholder:text-foreground/30 focus:border-[var(--accent)] focus:shadow-[0_0_38px_var(--glow)]"
            />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-h-5 text-sm text-muted">{status}</p>
            <Button type="submit" variant="primary" disabled={isLoading}>
              <Mail size={16} aria-hidden="true" />
              Send magic link
            </Button>
          </div>
        </form>
      </div>
    </section>
  )
}

