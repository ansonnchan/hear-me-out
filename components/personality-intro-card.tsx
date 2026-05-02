'use client'

import Image from 'next/image'
import { KeyboardEvent, useState } from 'react'
import { personalityImages } from '@/lib/personality-assets'
import { personalities, type PersonalityKey } from '@/lib/personalities'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

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

//for that glow popout when user hovers over personality card
const glowColors: Record<PersonalityKey, string> = {
  cotton: 'rgba(186, 230, 253, 0.5)', // pastel blue
  aristotle: 'rgba(30, 58, 138, 0.5)', // dark blue
  ming: 'rgba(255, 255, 255, 0.4)',    // misty white
  angel: 'rgba(244, 114, 182, 0.5)',   // pink
  'auntie-zhang': 'rgba(34, 197, 94, 0.5)' // green
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
    <motion.button
      type="button"
      onClick={() => setIsFlipped((flipped) => !flipped)}
      onKeyDown={handleKeyDown}

      whileHover={{ scale: 1.04, y: -8 }}
      whileFocus={{ scale: 1.04, y: -8 }}
      whileTap={{ scale: 0.98 }}

      animate={{
        boxShadow: isFlipped 
          ? `0 20px 40px -10px ${glowColors[personalityKey]}` 
          : `0 0px 0px 0px rgba(0,0,0,0)`
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={cn(
        "group relative h-[420px] w-[280px] shrink-0 snap-center rounded-[8px] text-left outline-none [perspective:1200px] sm:w-[310px]",
        "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        // Add a subtle transition for the glow on hover even when not flipped
        "hover:shadow-[0_0_40px_-10px_var(--hover-glow)]"
      )}
      style={{ 
        // Passing the color as a CSS variable for the tailwind hover class
        ['--hover-glow' as any]: glowColors[personalityKey] 
      }}
      aria-pressed={isFlipped}
      aria-label={`${personality.name}. Flip card`}
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
            boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${personality.accent} 22%, transparent)`,
          }}
        >
          <span
            className="pointer-events-none absolute inset-x-6 top-0 z-10 h-px opacity-70 transition-opacity duration-300 group-hover:opacity-100"
            style={{ backgroundColor: personality.accent }}
          />
          
          <Image
            src={personalityImages[personality.key]}
            alt=""
            // Increased height and scale for "larger background" feel
            className="h-[310px] w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-110"
            sizes="(max-width: 640px) 280px, 310px"
            placeholder="blur"
          />
          
          <span className="block p-5">
            <span className="block font-display text-2xl font-medium">{personality.name}</span>
            <span className="mt-1 block text-sm text-muted">{personality.tagline}</span>
          </span>
        </span>

        {/* BACK OF CARD */}
        <span
          className="absolute inset-0 flex rounded-[8px] bg-[rgba(255,255,255,0.05)] p-8 [backface-visibility:hidden] [transform:rotateY(180deg)]"
          style={{
            boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${personality.accent} 28%, transparent)`,
          }}
        >
          <span className="my-auto block">
            <span className="block font-display text-3xl font-medium">{personality.name}</span>
            {/* Using your font-classic/serif-copy class */}
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
  );
}