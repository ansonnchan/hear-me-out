'use client'

import Image from 'next/image'
import { KeyboardEvent, useState } from 'react'
import { personalityImages } from '@/lib/personality-assets'
import { personalities, type PersonalityKey } from '@/lib/personalities'
import { cn } from '@/lib/utils'

const personalityDescriptions: Record<PersonalityKey, string> = {
  cotton:
    'Cotton receives the first rush of feeling without trying to fix it. Best for late-night heaviness, tender overwhelm, and the moments when your words need somewhere soft to land.',
  aristotle:
    'Aristotle clears a little space around the problem. Best when a choice feels tangled and you want calm reasoning without being rushed toward an answer.',
  ming:
    'Venerable Ming lets the noise settle before speaking. Best for spiraling thoughts, overthinking, and moments that need distance more than urgency.',
  angel:
    'Angel stays close to the part of you that is still trying. Best for self-doubt, bruised confidence, and days when you need someone gentle in your corner.',
  'auntie-zhang':
    'Auntie Zhang tells the truth with care and expects you to meet yourself honestly. Best for avoidance, procrastination, and the moments when kindness needs a backbone.',
}

interface PersonalityIntroCardProps {
  personalityKey: PersonalityKey
}

export function PersonalityIntroCard({ personalityKey }: PersonalityIntroCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const personality = personalities[personalityKey]

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setIsFlipped((flipped) => !flipped)
    }
  }

  return (
    <button
      type="button"
      onClick={() => setIsFlipped((flipped) => !flipped)}
      onKeyDown={handleKeyDown}
      className="group h-[420px] w-[280px] shrink-0 snap-center rounded-[8px] text-left outline-none [perspective:1200px] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-[310px]"
      aria-pressed={isFlipped}
      aria-label={`${personality.name}. Flip card`}
    >
      <span
        className={cn(
          'relative block h-full w-full rounded-[8px] transition-transform duration-500 ease-soft [transform-style:preserve-3d]',
          isFlipped && '[transform:rotateY(180deg)]',
        )}
      >
        <span
          className="absolute inset-0 overflow-hidden rounded-[8px] bg-[rgba(255,255,255,0.035)] [backface-visibility:hidden]"
          style={{
            boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${personality.accent} 22%, transparent)`,
          }}
        >
          <span
            className="pointer-events-none absolute inset-x-6 top-0 z-10 h-px opacity-70 transition-opacity duration-300 group-hover:opacity-100"
            style={{ backgroundColor: personality.accent }}
          />
          <span
            className="pointer-events-none absolute -right-10 -top-10 z-10 h-36 w-36 rounded-full opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-100"
            style={{ backgroundColor: personality.glow }}
          />
          <Image
            src={personalityImages[personality.key]}
            alt=""
            className="h-[290px] w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-[1.025]"
            sizes="(max-width: 640px) 280px, 310px"
            placeholder="blur"
          />
          <span className="block p-5">
            <span className="block font-display text-2xl font-medium">{personality.name}</span>
            <span className="mt-1 block text-sm text-muted">{personality.tagline}</span>
          </span>
        </span>

        <span
          className="absolute inset-0 flex rounded-[8px] bg-[rgba(255,255,255,0.05)] p-6 [backface-visibility:hidden] [transform:rotateY(180deg)]"
          style={{
            boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${personality.accent} 28%, transparent), 0 18px 70px ${personality.glow}`,
          }}
        >
          <span className="my-auto block">
            <span className="block font-display text-3xl font-medium">{personality.name}</span>
            <span className="font-serif-copy mt-5 block text-[15px] leading-7 text-foreground/72">
              {personalityDescriptions[personality.key]}
            </span>
            <span className="mt-6 block text-xs text-muted">Tap to return.</span>
          </span>
        </span>
      </span>
    </button>
  )
}
