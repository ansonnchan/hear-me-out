import Link from 'next/link'
import { ArrowRight, Cat, Sparkles } from 'lucide-react'
import { LandingHero } from '@/components/landing-hero'
import { PersonalityShowcase } from '@/components/personality-showcase'

export default function HomePage() {
  return (
    <div className="space-y-8 pb-8 sm:space-y-12">
      <LandingHero />

      <section id="voices" className="paper-texture paper-shadow relative scroll-mt-24 overflow-hidden rounded-[18px] border border-[#bca68e]/20 px-4 py-12 sm:px-7 sm:py-14 lg:px-10">
        <span className="absolute left-[7%] top-[16%] h-2.5 w-2.5 rotate-45 rounded-[3px] bg-[#f3c0c4]/55" />
        <span className="absolute right-[6%] top-[10%] h-2 w-2 rotate-12 rounded-full bg-[#eec3c8]/55" />
        <span className="absolute bottom-[12%] left-[34%] h-2.5 w-2 rotate-45 rounded-[3px] bg-[#f3c0c4]/45" />

        <div className="relative mx-auto max-w-3xl text-center">
          <p className="font-hand text-[#9b7e67]">Who would you like to hear today?</p>
          <h2 className="mt-1 font-hand text-4xl font-bold leading-tight text-[#493a32] sm:text-5xl">Choose a personality</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#7b6b60]">Each has a different way of seeing the world.</p>
        </div>

        <div className="relative mt-8"><PersonalityShowcase /></div>

        <div className="relative mt-7 flex justify-center">
          <Link href="/vent" className="inline-flex h-11 items-center gap-2 rounded-full border border-[#d8c6b2]/70 bg-[#f8e8d3] px-5 text-sm font-medium text-[#6c584a] shadow-[0_6px_18px_rgba(96,66,45,.09)] transition hover:-translate-y-0.5 hover:bg-[#f5dfc2]">
            <Sparkles size={15} /> Not sure? We&apos;ll help choose. <ArrowRight size={15} />
          </Link>
        </div>

        <Cat className="absolute bottom-2 right-5 text-[#aa8c78]/55" size={36} strokeWidth={1.25} aria-hidden="true" />
      </section>
    </div>
  )
}
