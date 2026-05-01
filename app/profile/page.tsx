import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ProfilePage() {
  return (
    <section className="mx-auto max-w-3xl py-20 text-center">
      <div className="glass-panel rounded-[8px] p-8 sm:p-10">
        <p className="mb-3 text-sm text-[var(--accent)]">No account needed.</p>
        <h1 className="text-balance font-display text-5xl font-medium leading-tight">
          Nothing to manage.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted">
          vent.ai does not keep profiles, saved sessions, or settings. Choose a lens when you write, then let the moment pass.
        </p>
        <Button asChild variant="primary" size="lg" className="mt-8">
          <Link href="/vent">
            Let it out
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  )
}

