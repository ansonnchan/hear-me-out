import { LandingHero } from '@/components/landing-hero'
import { PersonalityIntroCard } from '@/components/personality-intro-card'
import { QuoteDisplay } from '@/components/quote-display'
import { personalityList } from '@/lib/personalities'

export default function HomePage() {
  return (
    <div className="pb-16">
      <LandingHero />

      <div className="mx-auto mt-4 max-w-4xl">
        <QuoteDisplay />
      </div>

      <section className="mx-auto mt-12 max-w-5xl sm:mt-20">
        <div className="mb-8 max-w-2xl space-y-3">
          <p className="text-sm text-[var(--accent)]">Choose the room you want to enter.</p>
          <h2 className="font-display text-4xl font-medium leading-tight sm:text-5xl">
            Five ways to hear yourself think
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {personalityList.map((personality) => (
            <PersonalityIntroCard key={personality.key} personalityKey={personality.key} />
          ))}
        </div>
      </section>
    </div>
  )
}
