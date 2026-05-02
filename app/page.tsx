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
          AI can&apos;t replace a friend.
          <br />
          But when you need to clear your head, sometimes any quiet listener will do.
        </p>
      </div>

      <section className="mx-[calc(50%-50vw)] mt-12 w-screen px-5 sm:mt-20 sm:px-8">
        <div className="mx-auto mb-8 max-w-6xl space-y-3">
          <h2 className="font-display text-3xl font-medium leading-tight sm:text-4xl lg:text-[2.65rem]">
            Choose a personality, share your thoughts, and see what they say.
          </h2>
        </div>

        <PersonalityShowcase />
      </section>
    </div>
  )
}
