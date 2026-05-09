'use client'

import Image from 'next/image'
import { KeyboardEvent, MouseEvent, useState } from 'react'
import { motion } from 'framer-motion'
import { personalityImages } from '@/lib/personality-assets'
import { personalities, type PersonalityKey } from '@/lib/personalities'
import { cn } from '@/lib/utils'

const personalityDescriptions: Record<PersonalityKey, string> = {
  cotton:
    'Cotton receives the first rush of feeling without trying to fix it. Best for late-night heaviness, tender overwhelm, and the moments when your words need somewhere soft to land.',
  aristotle:
    'Aristotle clears a little space around the problem. Best when a choice feels tangled and you want calm reasoning without being rushed toward an answer.',
  'venerable-ming':
    'Venerable Ming lets the noise settle before speaking. Best for spiraling thoughts, overthinking, and moments that need distance more than urgency.',
  angel:
    'Angel stays close to the part of you that is still trying. Best for self-doubt, bruised confidence, and days when you need someone gentle in your corner.',
  'auntie-zhang':
    'Auntie Zhang tells the truth with care and expects you to meet yourself honestly. Best for avoidance, procrastination, and the moments when kindness needs a backbone.',
}

const glowColors: Record<PersonalityKey, string> = {
  cotton: 'rgba(186, 230, 253, 0.48)',
  aristotle: 'rgba(30, 58, 138, 0.5)',
  'venerable-ming': 'rgba(236, 248, 255, 0.46)',
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

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onSelect?.()

    if (event.detail === 0) return

    setIsFlipped((flipped) => !flipped)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
    }
  }

  const glow = glowColors[personalityKey]

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      animate={{
        scale: isSelected ? 1.05 : 1,
        y: isSelected ? -15 : 0,

        boxShadow: isSelected
          ? `0 25px 50px -12px ${glow}`
          : '0 0 0 0 rgba(0,0,0,0)',
      }}
      whileHover={{ y: -10, scale: isSelected ? 1.05 : 1.02 }}
      whileTap={{ scale: 0.98 }}

      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 25,

        boxShadow: { duration: isSelected ? 0.3 : 0 },
      }}
      className={cn(
        'group relative h-[380px] w-[255px] shrink-0 snap-center rounded-[8px] text-left outline-none [perspective:1200px]',
        'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )}
      aria-pressed={isFlipped}
      data-selected={isSelected}
    >
      <span
        className={cn(
          'relative block h-full w-full rounded-[8px] transition-transform duration-700 ease-soft [transform-style:preserve-3d]',
          isFlipped && '[transform:rotateY(180deg)]',
        )}
      >
        {/* FRONT OF CARD */}
        <span
          className="absolute inset-0 overflow-hidden rounded-[8px] bg-[rgba(255,255,255,0.035)] [backface-visibility:hidden]"
          style={{
            boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${personality.accent} ${isSelected ? 42 : 22}%, transparent)`,
          }}
        >
          <Image
            src={personalityImages[personality.key]}
            alt=""
            className="h-[270px] w-full object-cover opacity-95"
            sizes="265px"
            placeholder="blur"
          />

          <span className="block p-4">
            <span className="block font-display text-xl font-medium">{personality.name}</span>
            <span className="mt-1 block text-xs text-muted leading-relaxed line-clamp-2">
              {personality.tagline}
            </span>
          </span>
        </span>

        {/* BACK OF CARD */}
        <span
          className="absolute inset-0 flex rounded-[8px] bg-[rgba(255,255,255,0.05)] p-6 [backface-visibility:hidden] [transform:rotateY(180deg)]"
          style={{
            boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${personality.accent} ${isSelected ? 46 : 28}%, transparent)`,
          }}
        >
          <span className="my-auto block">
            <span className="block font-display text-2xl font-medium">{personality.name}</span>
            <span className="font-serif-copy mt-4 block text-[14px] leading-6 text-foreground/82">
              {personalityDescriptions[personality.key]}
            </span>
            <span className="mt-6 block text-[10px] text-muted/50">
              Tap to return.
            </span>
          </span>
        </span>
      </span>
    </motion.button>
  )
}
