import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { AuthCard } from '@/components/auth-card'
import { ResponsePanel } from '@/components/response-panel'
import { isPersonalityKey, type PersonalityKey } from '@/lib/personalities'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { formatSessionDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

interface SessionRow {
  id: string
  title: string | null
  original_text: string
  created_at: string
}

interface ResponseRow {
  personality: string
  content: string
  created_at: string
}

export default async function SessionDetailPage({ params }: { params: { id: string } }) {
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

  const { data: session } = await supabase
    .from('sessions')
    .select('id,title,original_text,created_at')
    .eq('id', params.id)
    .single()

  if (!session) {
    notFound()
  }

  const { data: responses } = await supabase
    .from('responses')
    .select('personality,content,created_at')
    .eq('session_id', params.id)
    .order('created_at', { ascending: true })

  const initialResponses: Partial<Record<PersonalityKey, string>> = {}

  ;((responses ?? []) as ResponseRow[]).forEach((response) => {
    if (isPersonalityKey(response.personality)) {
      initialResponses[response.personality] = response.content
    }
  })

  const sessionRow = session as SessionRow

  return (
    <section className="mx-auto max-w-4xl py-12">
      <Link
        href="/history"
        className="mb-8 inline-flex items-center gap-2 text-sm text-muted transition-colors duration-300 hover:text-foreground"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Back to history
      </Link>

      <div className="mb-9 space-y-4">
        <p className="text-sm text-[var(--accent)]">{formatSessionDate(sessionRow.created_at)}</p>
        <h1 className="text-balance font-display text-5xl font-medium leading-tight">{sessionRow.title || 'Untitled entry'}</h1>
      </div>

      <div className="glass-panel mb-8 rounded-[8px] p-6 sm:p-8">
        <p className="mb-4 text-sm text-muted">Original vent</p>
        <p className="whitespace-pre-wrap text-lg leading-8 text-foreground/82">{sessionRow.original_text}</p>
      </div>

      <ResponsePanel
        originalText={sessionRow.original_text}
        initialSessionId={sessionRow.id}
        initialResponses={initialResponses}
      />
    </section>
  )
}
