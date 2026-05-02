'use client'

import Image from 'next/image'
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

  return (
    <div className={cn('w-full overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}>
      <div className="mx-auto flex min-w-max justify-center gap-3 px-1">
        {personalityList.map((personality) => {
          const selected = active === personality.key
          const activePersonality = personalities[personality.key]

          return (
            <button
              key={personality.key}
              type="button"
              onClick={() => choose(personality.key)}
              className={cn(
                'group inline-flex h-14 items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-4 text-sm font-medium transition-all duration-300 ease-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                selected
                  ? 'scale-[1.03] bg-[var(--color-surface-strong)] text-foreground shadow-[0_0_36px_var(--glow)]'
                  : 'border-[var(--color-border)] bg-[rgba(255,255,255,0.025)] text-muted opacity-72 hover:bg-[var(--color-surface)] hover:text-foreground hover:opacity-100',
              )}
              style={{
                borderColor: selected ? activePersonality.accent : undefined,
              }}
              aria-pressed={selected}
            >
              <span className="relative h-11 w-11 overflow-hidden rounded-full bg-[rgba(255,255,255,0.05)]" aria-hidden="true">
                <Image
                  src={personalityAtmospheres[personality.key]}
                  alt=""
                  fill
                  className={cn('object-cover object-top transition-opacity duration-300', selected ? 'opacity-95' : 'opacity-60')}
                  sizes="44px"
                />
              </span>
              <span className="whitespace-nowrap">{personality.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

