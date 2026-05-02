import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function LandingHero() {
  return (
    <section className="mx-auto max-w-4xl pt-10 text-center sm:pt-16">
      <div className="space-y-7">
        <div className="space-y-4">

          <h1 className="text-balance font-display text-5xl font-medium leading-tight sm:text-6xl">
            Need to vent?
          </h1>

          <p className="mx-auto max-w-xl text-lg leading-8 text-muted">
            Don&apos;t keep it bottled up.
          </p>

          <p className="text-xs text-muted/70">
          Whatever happens in vent.ai stays in vent.ai. <br />
            Sessions are private and are wiped when you leave.
          </p>
        </div>

        <div className="flex justify-center">
          <Button asChild variant="primary" size="lg">
            <Link href="/vent">
              Let it out
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
