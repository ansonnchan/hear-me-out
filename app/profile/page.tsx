import { AuthCard } from '@/components/auth-card'
import { ProfileSettings } from '@/components/profile-settings'
import { defaultPersonality, isPersonalityKey } from '@/lib/personalities'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface ProfileRow {
  default_personality: string | null
}

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return <AuthCard />
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <AuthCard />
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('default_personality')
    .eq('id', user.id)
    .maybeSingle()

  const row = profile as ProfileRow | null
  const preferred = row?.default_personality

  return (
    <ProfileSettings
      email={user.email ?? 'Signed in'}
      defaultPersonality={isPersonalityKey(preferred) ? preferred : defaultPersonality}
    />
  )
}
