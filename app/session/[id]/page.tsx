import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SessionDetailPage() {
  return (
    <section className="mx-auto max-w-3xl py-20 text-center">
      <div className="glass-panel rounded-[8px] p-8 sm:p-10">
        <p className="mb-3 text-sm text-[var(--accent)]">This page has nothing to recover.</p>
        <h1 className="text-balance font-display text-5xl font-medium leading-tight">
          Sessions are ephemeral now.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted">
          vent.ai keeps the current conversation only in memory. There are no saved entries, accounts, or old rooms to reopen.
        </p>
        <Button asChild variant="primary" size="lg" className="mt-8">
          <Link href="/vent">
            Begin again
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  )
}

