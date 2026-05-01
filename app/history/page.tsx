import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function HistoryPage() {
  return (
    <section className="mx-auto max-w-3xl py-20 text-center">
      <div className="glass-panel rounded-[8px] p-8 sm:p-10">
        <p className="mb-3 text-sm text-[var(--accent)]">Nothing is saved here.</p>
        <h1 className="text-balance font-display text-5xl font-medium leading-tight">
          vent.ai forgets with you.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted">
          Sessions live only in the open tab. Refresh, close, or leave, and the page lets them go.
        </p>
        <Button asChild variant="primary" size="lg" className="mt-8">
          <Link href="/vent">
            Start a new vent
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  )
}

