'use client'

import Image from 'next/image'
import { KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import { personalityAtmospheres } from '@/lib/personality-assets'
import { personalities, personalityList, type PersonalityKey } from '@/lib/personalities'
import { cn } from '@/lib/utils'
import { useVentStore } from '@/store/vent-store'

interface PersonalitySelectorProps {
  value?: PersonalityKey | null
  onValueChange?: (personality: PersonalityKey) => void
  className?: string
}

export function PersonalitySelector({ value, onValueChange, className }: PersonalitySelectorProps) {
  const storeValue = useVentStore((state) => state.activePersonality)
  const setStoreValue = useVentStore((state) => state.setActivePersonality)
  const active = value === null ? null : value ?? storeValue

  function choose(personality: PersonalityKey) {
    setStoreValue(personality)
    onValueChange?.(personality)
  }

  function blockKeyboardActivation(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
    }
  }

  return (
    <div className={cn('w-full overflow-x-auto pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}>
      <div className="mx-auto flex min-w-max justify-center gap-3 px-1">
        {personalityList.map((personality) => {
          const selected = active === personality.key
          const activePersonality = personalities[personality.key]

          return (
            <motion.button
              key={personality.key}
              type="button"
              onClick={() => choose(personality.key)}
              onKeyDown={blockKeyboardActivation}
              animate={{ y: selected ? -3 : 0, scale: selected ? 1.035 : 1 }}
              whileHover={{ y: selected ? -3 : -2, scale: selected ? 1.05 : 1.035 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className={cn(
                'group inline-flex h-14 items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-4 text-sm font-medium transition-all duration-300 ease-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                selected
                  ? 'scale-[1.03] bg-[var(--color-surface-strong)] text-foreground opacity-100 shadow-[0_0_42px_color-mix(in_srgb,var(--accent)_30%,transparent)]'
                  : 'border-[var(--color-border)] bg-[rgba(255,255,255,0.025)] text-muted opacity-72 hover:bg-[var(--color-surface)] hover:text-foreground hover:opacity-100 hover:brightness-110 hover:shadow-[0_0_28px_color-mix(in_srgb,var(--accent)_18%,transparent)]',
              )}
              style={{
                borderColor: selected ? activePersonality.accent : undefined,
              }}
              aria-pressed={selected}
            >
              <span
                className={cn(
                  'relative h-11 w-11 overflow-hidden rounded-full bg-[rgba(255,255,255,0.05)] transition-transform duration-300 ease-soft',
                  selected ? 'scale-[1.05]' : 'group-hover:scale-[1.06]',
                )}
                aria-hidden="true"
              >
                <Image
                  src={personalityAtmospheres[personality.key]}
                  alt=""
                  fill
                  className={cn('scale-110 object-cover object-top transition-opacity duration-300', selected ? 'opacity-100' : 'opacity-80 group-hover:opacity-95')}
                  sizes="44px"
                />
              </span>
              <span className="whitespace-nowrap">{personality.name}</span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
