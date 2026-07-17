'use client'

import Image from 'next/image'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { personalityPortraits } from '@/lib/personality-assets'
import { personalities, type PersonalityKey } from '@/lib/personalities'

type GentlePersona = Extract<PersonalityKey, 'cotton' | 'angel'>

interface GentleLensDialogProps {
  open: boolean
  currentPersonality?: PersonalityKey | null
  onChoose: (personality: GentlePersona) => void
  onClose: () => void
}

const gentleOptions: GentlePersona[] = ['cotton', 'angel']

export function GentleLensDialog({ open, currentPersonality, onChoose, onClose }: GentleLensDialogProps) {
  if (!open) return null

  const current = currentPersonality ? personalities[currentPersonality] : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#392821]/55 px-5 backdrop-blur-sm">
      <div className="paper-card relative w-full max-w-md rounded-[1.75rem] p-6 shadow-[0_30px_90px_rgba(57,40,33,0.3)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-2 text-muted transition-colors hover:bg-[var(--color-surface)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          aria-label="Close gentler lens prompt"
        >
          <X size={16} aria-hidden="true" />
        </button>

        <div className="pr-8">
          <p className="text-sm text-[var(--accent)]">A gentler lens may fit</p>
          <h2 className="mt-2 font-display text-3xl font-medium leading-tight text-foreground">
            Would you like to switch for this response?
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            {current
              ? `This seems like it may need more softness than ${current.name}. `
              : 'This seems like it may need a softer lens. '}
            You can choose Cotton or Angel before we reply.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {gentleOptions.map((personalityKey) => {
            const personality = personalities[personalityKey]

            return (
              <Button
                key={personality.key}
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => onChoose(personalityKey)}
                className="h-16 justify-start rounded-2xl px-3 text-[#342620] shadow-none transition-transform hover:-translate-y-0.5 hover:scale-[1.02] hover:brightness-105"
                style={{
                  backgroundColor: personality.accent,
                  borderColor: `color-mix(in srgb, ${personality.accent} 42%, transparent)`,
                  boxShadow: `0 0 30px ${personality.glow}`,
                }}
              >
                <span className="relative h-10 w-10 overflow-hidden rounded-full bg-white/55">
                  <Image
                    src={personalityPortraits[personality.key]}
                    alt=""
                    fill
                    className="object-cover object-top"
                    sizes="40px"
                  />
                </span>
                <span>{personality.name}</span>
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
