'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LogOut, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PersonalitySelector } from '@/components/personality-selector'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { type PersonalityKey } from '@/lib/personalities'
import { useVentStore } from '@/store/vent-store'

interface ProfileSettingsProps {
  email: string
  defaultPersonality: PersonalityKey
}

export function ProfileSettings({ email, defaultPersonality }: ProfileSettingsProps) {
  const router = useRouter()
  const setStoreDefault = useVentStore((state) => state.setDefaultPersonality)
  const [selected, setSelected] = useState<PersonalityKey>(defaultPersonality)
  const [status, setStatus] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function save() {
    const supabase = createSupabaseBrowserClient()
    if (!supabase) {
      setStatus('Saving needs Supabase keys first.')
      return
    }

    setIsSaving(true)
    const { error } = await supabase.from('profiles').update({ default_personality: selected }).eq('id', (await supabase.auth.getUser()).data.user?.id)
    setIsSaving(false)

    if (error) {
      setStatus('Something went quiet. Try again in a moment.')
      return
    }

    setStoreDefault(selected)
    setStatus('Saved.')
  }

  async function signOut() {
    const supabase = createSupabaseBrowserClient()
    if (!supabase) return
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <section className="mx-auto max-w-3xl py-14">
      <div className="mb-10 space-y-3">
        <p className="text-sm text-[var(--accent)]">Profile</p>
        <h1 className="font-display text-5xl font-medium">A few quiet defaults.</h1>
      </div>

      <div className="glass-panel rounded-[8px] p-6 sm:p-8">
        <div className="space-y-8">
          <div className="space-y-2">
            <p className="text-sm text-muted">Account email</p>
            <p className="text-lg">{email}</p>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-muted">Default lens</p>
            <PersonalitySelector value={selected} onValueChange={setSelected} />
          </div>

          <div className="flex flex-col gap-3 border-t border-[var(--color-line)] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-h-5 text-sm text-muted">{status}</p>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={save} disabled={isSaving}>
                <Save size={16} aria-hidden="true" />
                Save
              </Button>
              <Button type="button" variant="ghost" onClick={signOut}>
                <LogOut size={16} aria-hidden="true" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
