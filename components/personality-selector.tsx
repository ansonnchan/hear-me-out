'use client'

import { personalities, personalityList, type PersonalityKey } from '@/lib/personalities'
import { cn } from '@/lib/utils'
import { useVentStore } from '@/store/vent-store'

interface PersonalitySelectorProps {
  value?: PersonalityKey
  onValueChange?: (personality: PersonalityKey) => void
  className?: string
}

export function PersonalitySelector({ value, onValueChange, className }: PersonalitySelectorProps) {
  const storeValue = useVentStore((state) => state.activePersonality)
  const setStoreValue = useVentStore((state) => state.setActivePersonality)
  const active = value ?? storeValue

  function choose(personality: PersonalityKey) {
    setStoreValue(personality)
    onValueChange?.(personality)
  }

  return (
    <div className={cn('w-full overflow-x-auto pb-2', className)}>
      <div className="flex min-w-max gap-3">
        {personalityList.map((personality) => {
          const selected = active === personality.key
          const activePersonality = personalities[personality.key]

          return (
            <button
              key={personality.key}
              type="button"
              onClick={() => choose(personality.key)}
              className={cn(
                'group flex min-h-[64px] min-w-[150px] items-center gap-3 rounded-full border px-4 text-left transition-all duration-300 ease-soft',
                selected
                  ? 'bg-[var(--color-surface-strong)] shadow-[0_0_34px_var(--glow)]'
                  : 'border-[var(--color-border)] bg-[rgba(255,255,255,0.025)] text-muted hover:bg-[var(--color-surface)] hover:text-foreground',
              )}
              style={{
                borderColor: selected ? activePersonality.accent : undefined,
              }}
              aria-pressed={selected}
            >
              <span className="text-xl" aria-hidden="true">
                {personality.emoji}
              </span>
              <span className="grid gap-0.5">
                <span className="text-sm font-medium text-foreground">{personality.name}</span>
                <span
                  className={cn(
                    'max-w-[92px] truncate text-[11px] leading-4 transition-opacity duration-300',
                    selected ? 'text-foreground/55 opacity-100' : 'text-foreground/45 opacity-0 group-hover:opacity-100',
                  )}
                >
                  {personality.tagline}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

