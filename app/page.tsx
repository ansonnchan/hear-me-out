import { LandingHero } from '@/components/landing-hero'
import { PersonalityShowcase } from '@/components/personality-showcase'
import { QuoteDisplay } from '@/components/quote-display'

export default function HomePage() {
  return (
    <div className="pb-16">
      <LandingHero />

      <div className="mx-auto mt-4 max-w-4xl text-center">
        <QuoteDisplay />
        <p className="mx-auto max-w-lg text-sm leading-6 text-muted">
          AI is not a substitute for a real friend.
          <br />
          Sometimes, a different lens helps you hear yourself.
        </p>
      </div>

      <section className="mx-auto mt-12 max-w-6xl sm:mt-20">
        <div className="mb-8 max-w-2xl space-y-3">
          <h2 className="font-display text-4xl font-medium leading-tight sm:text-5xl">
            Five ways to hear yourself think
          </h2>
        </div>

        <PersonalityShowcase />
      </section>
    </div>
  )
}
