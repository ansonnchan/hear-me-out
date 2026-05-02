'use client'

import Image from 'next/image'
import { KeyboardEvent, useState } from 'react'
import { motion } from 'framer-motion'
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

const glowColors: Record<PersonalityKey, string> = {
  cotton: 'rgba(186, 230, 253, 0.48)',
  aristotle: 'rgba(30, 58, 138, 0.5)',
  ming: 'rgba(236, 248, 255, 0.46)',
  angel: 'rgba(244, 114, 182, 0.48)',
  'auntie-zhang': 'rgba(34, 197, 94, 0.48)',
}

interface PersonalityIntroCardProps {
  personalityKey: PersonalityKey
  isSelected?: boolean
  onSelect?: () => void
}

export function PersonalityIntroCard({ personalityKey, isSelected = false, onSelect }: PersonalityIntroCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const personality = personalities[personalityKey]

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setIsFlipped((flipped) => !flipped)
    }
  }

  function handleClick() {
    onSelect?.()
    setIsFlipped((flipped) => !flipped)
  }

  const glow = glowColors[personalityKey]

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      animate={{
        scale: isSelected ? 1.045 : 1,
        y: isSelected ? -10 : 0,
        boxShadow: isSelected ? `0 20px 54px -16px ${glow}, 0 0 0 1px ${glow}` : '0 0 0 0 rgba(0,0,0,0)',
      }}
      whileHover={{ scale: isSelected ? 1.065 : 1.035, y: isSelected ? -12 : -7 }}
      whileFocus={{ scale: isSelected ? 1.065 : 1.035, y: isSelected ? -12 : -7 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className={cn(
        'group relative h-[420px] w-[280px] shrink-0 snap-center rounded-[8px] text-left outline-none [perspective:1200px] sm:w-[310px]',
        'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )}
      aria-pressed={isFlipped}
      data-selected={isSelected}
      aria-label={`${personality.name}. Flip card`}
    >
      <span
        className={cn(
          'relative block h-full w-full rounded-[8px] transition-transform duration-700 ease-soft [transform-style:preserve-3d]',
          isFlipped && '[transform:rotateY(180deg)]',
        )}
      >
        <span
          className="absolute inset-0 overflow-hidden rounded-[8px] bg-[rgba(255,255,255,0.035)] [backface-visibility:hidden]"
          style={{
            boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${personality.accent} ${isSelected ? 42 : 22}%, transparent)`,
          }}
        >
          <span
            className="pointer-events-none absolute inset-x-6 top-0 z-10 h-px opacity-70 transition-opacity duration-300 group-hover:opacity-100"
            style={{ backgroundColor: personality.accent }}
          />
          
          <Image
            src={personalityImages[personality.key]}
            alt=""
            className="h-[316px] w-full object-cover opacity-95 transition-transform duration-700 group-hover:scale-110"
            sizes="(max-width: 640px) 280px, 310px"
            placeholder="blur"
          />
          
          <span className="block p-5">
            <span className="block font-display text-2xl font-medium">{personality.name}</span>
            <span className="mt-1 block text-sm text-muted">{personality.tagline}</span>
          </span>
        </span>

        <span
          className="absolute inset-0 flex rounded-[8px] bg-[rgba(255,255,255,0.05)] p-8 [backface-visibility:hidden] [transform:rotateY(180deg)]"
          style={{
            boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${personality.accent} ${isSelected ? 46 : 28}%, transparent)`,
          }}
        >
          <span className="my-auto block">
            <span className="block font-display text-3xl font-medium">{personality.name}</span>
            <span className="font-serif-copy mt-6 block text-[17px] leading-relaxed text-foreground/80">
              {personalityDescriptions[personality.key]}
            </span>
            <span className="mt-8 block text-xs tracking-widest uppercase text-muted/60">
              Tap to return
            </span>
          </span>
        </span>
      </span>
    </motion.button>
  )
}
