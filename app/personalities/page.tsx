import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, MessageCircleHeart, Sparkles } from 'lucide-react'
import { personalityImages, personalityScenes } from '@/lib/personality-assets'
import { personalities, personalityList, type PersonalityKey } from '@/lib/personalities'
import { cn } from '@/lib/utils'

const profiles: Record<PersonalityKey, { intro: string; bestFor: string[]; promise: string; sample: string }> = {
  cotton: {
    intro: 'Cotton makes room for the feeling before reaching for an answer. Nothing has to be solved immediately.',
    bestFor: ['Overwhelm', 'Loneliness', 'Heavy days'],
    promise: 'Soft, patient listening without judgment or pressure.',
    sample: 'You do not have to carry all of this neatly. We can sit with one small piece at a time.',
  },
  aristotle: {
    intro: 'Aristotle steps back from the noise and helps reveal the assumptions, choices, and tradeoffs underneath it.',
    bestFor: ['Decisions', 'Confusion', 'Planning'],
    promise: 'Calm reasoning that turns a tangled thought into something workable.',
    sample: 'Let us separate what you know, what you fear, and what you still have the power to decide.',
  },
  'venerable-ming': {
    intro: 'Venerable Ming lets the water settle. His perspective is spacious, grounded, and never in a hurry.',
    bestFor: ['Overthinking', 'Acceptance', 'Perspective'],
    promise: 'Stillness and distance when your mind keeps circling the same place.',
    sample: 'Roots first. Growth later. You are not behind; you are becoming.',
  },
  angel: {
    intro: 'Angel stays close to the part of you that is still trying, especially when your own inner voice has become unkind.',
    bestFor: ['Self-doubt', 'Confidence', 'Reassurance'],
    promise: 'Warm encouragement that feels sincere rather than performative.',
    sample: 'The fact that this is difficult does not mean you are failing. I can still see how hard you are trying.',
  },
  'auntie-zhang': {
    intro: 'Auntie Zhang tells the truth with care. She expects action because she takes your potential seriously.',
    bestFor: ['Procrastination', 'Accountability', 'Momentum'],
    promise: 'Direct, practical guidance with kindness and a backbone.',
    sample: 'Stop waiting to feel ready. Choose the smallest honest action and do it before the day gets another vote.',
  },
}

export default function PersonalitiesPage() {
  return (
    <div className="space-y-10 pb-10 sm:space-y-14">
      <section className="paper-texture paper-shadow relative overflow-hidden rounded-[18px] border border-[#cbb79f]/25 px-5 py-14 text-center sm:px-10 sm:py-16">
        <span className="absolute left-[9%] top-[20%] h-2.5 w-2.5 rotate-45 rounded-[3px] bg-[#e9b7b0]/55" />
        <span className="absolute right-[11%] top-[14%] h-2 w-2 rotate-12 rounded-full bg-[#d9c5a9]/65" />
        <div className="relative mx-auto max-w-3xl">
          <p className="font-hand text-lg text-[#947864]">Same thought. Five ways of listening.</p>
          <h1 className="mt-2 font-display text-4xl font-medium leading-tight text-[#493a32] sm:text-6xl">Meet the personalities</h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[#75665c] sm:text-base">
            Each voice notices something different. Get to know how they listen, what moments they suit, and who feels right for you today.
          </p>
        </div>

        <nav className="relative mx-auto mt-9 flex max-w-4xl snap-x gap-3 overflow-x-auto pb-3 [scrollbar-width:none] sm:justify-center [&::-webkit-scrollbar]:hidden" aria-label="Jump to a personality">
          {personalityList.map((personality) => (
            <Link key={personality.key} href={`#${personality.key}`} className="group flex min-w-[130px] snap-center items-center gap-2 rounded-full border border-[#cdbba8]/45 bg-white/65 p-1.5 pr-4 text-xs font-semibold text-[#5d4d43] shadow-sm transition hover:-translate-y-0.5 hover:bg-white">
              <span className="relative h-9 w-9 overflow-hidden rounded-full"><Image src={personalityImages[personality.key]} alt="" fill className="object-cover object-top" sizes="36px" /></span>
              {personality.name}
            </Link>
          ))}
        </nav>
      </section>

      <div className="space-y-8">
        {personalityList.map((personality, index) => {
          const profile = profiles[personality.key]
          return (
            <section id={personality.key} key={personality.key} className="paper-shadow scroll-mt-24 overflow-hidden rounded-[18px] border border-[#c9b49c]/25 bg-[#fff9ed]">
              <div className="grid lg:grid-cols-2">
                <div className={cn('relative min-h-[360px] overflow-hidden sm:min-h-[460px]', index % 2 === 1 && 'lg:order-2')}>
                  <Image src={personalityScenes[personality.key]} alt={`${personality.name} in their illustrated space`} fill className="object-cover object-center" sizes="(max-width: 1024px) 100vw, 50vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#34231b]/28 via-transparent to-transparent" />
                  <div className="absolute bottom-5 left-5 flex items-center gap-3 rounded-full border border-white/25 bg-[#382820]/35 p-2 pr-4 text-white backdrop-blur-md">
                    <span className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-white/80"><Image src={personalityImages[personality.key]} alt="" fill className="object-cover object-top" sizes="40px" /></span>
                    <span className="font-hand text-lg font-bold">{personality.name}</span>
                  </div>
                </div>

                <div className={cn('paper-texture flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-12 lg:px-14', index % 2 === 1 && 'lg:order-1')}>
                  <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#d8c6b2]/55 bg-white/55 px-3 py-1 text-[10px] font-semibold uppercase tracking-[.14em] text-[#8b7464]">
                    <Sparkles size={12} /> {personality.tagline}
                  </div>
                  <h2 className="mt-5 font-hand text-4xl font-bold text-[#493a32] sm:text-5xl">{personality.name}</h2>
                  <p className="mt-4 max-w-lg text-sm leading-7 text-[#6f6056] sm:text-[15px]">{profile.intro}</p>

                  <div className="mt-7">
                    <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#927c6d]">Best for</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {profile.bestFor.map((item) => <span key={item} className="rounded-full border border-[#d6c5b2]/60 bg-white/60 px-3 py-1.5 text-xs text-[#65554a]">{item}</span>)}
                    </div>
                  </div>

                  <div className="mt-7 rounded-[12px] border border-[#d9c7b2]/55 bg-[#fffaf0] p-5 shadow-[0_6px_16px_rgba(91,62,43,.06)]">
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.13em] text-[#927c6d]"><MessageCircleHeart size={14} /> What it feels like</div>
                    <p className="mt-3 font-hand text-lg leading-7 text-[#5b4a40]">“{profile.sample}”</p>
                    <p className="mt-3 text-xs leading-5 text-[#8a776a]">{profile.promise}</p>
                  </div>

                  <Link href={`/vent?personality=${personality.key}`} className="mt-7 inline-flex h-11 w-fit items-center gap-2 rounded-full bg-[#493a32] px-5 text-sm font-semibold text-[#fff9ef] shadow-[0_8px_20px_rgba(73,58,50,.16)] transition hover:-translate-y-0.5 hover:bg-[#5b463c]">
                    Talk with {personality.name} <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
