import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Cat, LockKeyhole } from 'lucide-react'
import heroArtwork from '@/assets/hear-me-out-hero.png'

export function LandingHero() {
  return (
    <section className="paper-shadow relative isolate min-h-[620px] overflow-hidden rounded-[18px] border border-white/60 sm:min-h-[660px] lg:min-h-[690px]">
      <Image
        src={heroArtwork}
        alt="A warm illustrated reading nook overlooking mountains at sunset"
        fill
        priority
        className="object-cover object-[58%_center]"
        sizes="(max-width: 1440px) 100vw, 1360px"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(39,27,22,.73)_0%,rgba(49,33,26,.55)_34%,rgba(49,33,26,.16)_66%,rgba(36,24,20,.16)_100%)]" />

      <div className="absolute left-5 top-7 hidden -rotate-3 rounded-sm bg-[#fff8de]/90 px-5 py-4 text-[#6e5849] shadow-[0_8px_24px_rgba(45,28,19,.18)] backdrop-blur-sm md:block">
        <span className="font-hand block text-sm leading-6">Say what&apos;s sitting<br />on your heart.</span>
        <Cat className="ml-auto mt-1 opacity-60" size={18} strokeWidth={1.4} />
        <span className="absolute -top-2 left-1/2 h-4 w-14 -translate-x-1/2 rotate-2 bg-[#e8d7b8]/75" />
      </div>

      <div className="relative ml-auto flex min-h-[620px] w-full max-w-[780px] flex-col justify-center px-7 py-20 text-[#fffaf1] sm:min-h-[660px] sm:px-12 lg:min-h-[690px] lg:px-20">
        <p className="font-hand text-lg text-[#f2d8c5]">A quiet place for loud thoughts.</p>
        <h1 className="mt-3 max-w-xl font-hand text-5xl font-bold leading-[1.06] tracking-[-0.025em] sm:text-6xl lg:text-7xl">
          Same thought.<br />Different lens.
        </h1>
        <p className="mt-6 max-w-md text-sm leading-6 text-white/76 sm:text-base sm:leading-7">
          Share what&apos;s on your mind and hear it reflected through a voice that meets the moment.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/vent" className="inline-flex h-12 items-center gap-2 rounded-full bg-[#aa8ad8] px-6 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(48,30,65,.28)] transition hover:-translate-y-0.5 hover:bg-[#9876ca]">
            Start reflecting <ArrowRight size={16} />
          </Link>
          <Link href="#voices" className="inline-flex h-12 items-center rounded-full border border-white/30 bg-white/10 px-5 text-sm font-medium text-white/88 backdrop-blur-md transition hover:bg-white/18">
            Meet the personalities
          </Link>
        </div>
        <p className="mt-5 inline-flex items-center gap-2 text-xs leading-5 text-white/62">
          <LockKeyhole size={13} /> No sign-up. No saved history. Everything stays with you.
        </p>
      </div>

      <span className="absolute right-[9%] top-[12%] h-2.5 w-2.5 rotate-45 rounded-[3px] bg-[#f7c4c6]/80" />
      <span className="absolute right-[5%] top-[30%] h-2 w-2 rotate-12 rounded-full bg-[#ffe1bc]/75" />
      <span className="absolute bottom-[13%] left-[47%] h-2.5 w-2 rotate-45 rounded-[3px] bg-[#f2b6b5]/70" />
    </section>
  )
}
