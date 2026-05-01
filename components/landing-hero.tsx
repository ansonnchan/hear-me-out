import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function LandingHero() {
  return (
    <section className="mx-auto max-w-4xl pt-10 text-center sm:pt-16">
      <div className="space-y-7">
        <div className="space-y-4">
          <p className="text-sm text-[var(--accent)]">Same thought, different lens.</p>
          <h1 className="text-balance font-display text-5xl font-medium leading-tight sm:text-6xl">
            Not a therapist. Just a listener.
          </h1>
          <p className="mx-auto max-w-xl text-lg leading-8 text-muted">
            Write what is too tangled to hold alone. Hear it back through a voice that meets the moment.
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
