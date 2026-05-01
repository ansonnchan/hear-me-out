import { AuthCard } from '@/components/auth-card'
import { SessionCard } from '@/components/session-card'
import { isPersonalityKey, type PersonalityKey } from '@/lib/personalities'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface SessionRow {
  id: string
  title: string | null
  original_text: string
  created_at: string
}

interface ResponseRow {
  session_id: string
  personality: string
}

export default async function HistoryPage() {
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

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id,title,original_text,created_at')
    .order('created_at', { ascending: false })

  const sessionRows = (sessions ?? []) as SessionRow[]
  const sessionIds = sessionRows.map((session) => session.id)
  const responseMap = new Map<string, Set<PersonalityKey>>()

  if (sessionIds.length) {
    const { data: responses } = await supabase
      .from('responses')
      .select('session_id,personality')
      .in('session_id', sessionIds)

    ;((responses ?? []) as ResponseRow[]).forEach((response) => {
      if (!isPersonalityKey(response.personality)) return
      const set = responseMap.get(response.session_id) ?? new Set<PersonalityKey>()
      set.add(response.personality)
      responseMap.set(response.session_id, set)
    })
  }

  return (
    <section className="mx-auto max-w-4xl py-14">
      <div className="mb-10 space-y-3">
        <p className="text-sm text-[var(--accent)]">Saved sessions</p>
        <h1 className="font-display text-5xl font-medium">What you have let out.</h1>
      </div>

      {sessionRows.length ? (
        <div className="space-y-4">
          {sessionRows.map((session) => (
            <SessionCard
              key={session.id}
              id={session.id}
              title={session.title}
              originalText={session.original_text}
              createdAt={session.created_at}
              generatedPersonalities={[...(responseMap.get(session.id) ?? new Set<PersonalityKey>())]}
            />
          ))}
        </div>
      ) : (
        <div className="glass-panel rounded-[8px] p-10 text-center">
          <p className="font-display text-3xl text-foreground/82">Nothing here yet. Your first vent is waiting.</p>
        </div>
      )}
    </section>
  )
}
