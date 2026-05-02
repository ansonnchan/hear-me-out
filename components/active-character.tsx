'use client'

import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { personalityAtmospheres } from '@/lib/personality-assets'
import type { PersonalityKey } from '@/lib/personalities'

interface ActiveCharacterProps {
  personality: PersonalityKey
  className?: string
  variant?: 'peek' | 'portrait'
}

export function ActiveCharacter({ personality, className, variant = 'peek' }: ActiveCharacterProps) {
  if (variant === 'portrait') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={personality}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className={className}
        >
          <div className="relative h-16 w-16 overflow-hidden rounded-full border border-[var(--color-border)] bg-[rgba(255,255,255,0.045)] shadow-[0_0_36px_var(--glow)]">
            <Image
              src={personalityAtmospheres[personality]}
              alt=""
              fill
              className="object-cover object-top opacity-85"
              sizes="64px"
            />
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={personality}
        initial={{ opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 18 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={className}
      >
        <Image
          src={personalityAtmospheres[personality]}
          alt=""
          className="h-full w-auto max-w-full object-contain opacity-[0.32]"
          sizes="360px"
          priority={false}
        />
      </motion.div>
    </AnimatePresence>
  )
}
