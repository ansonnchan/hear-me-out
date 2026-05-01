import Link from 'next/link'
import { personalities, type PersonalityKey } from '@/lib/personalities'

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
  const personality = personalities[personalityKey]

  return (
    <Link
      href={`/vent?personality=${personality.key}`}
      className="group relative block min-h-full overflow-hidden rounded-[8px] bg-[rgba(255,255,255,0.035)] p-5 transition-all duration-300 ease-soft hover:-translate-y-1 hover:bg-[rgba(255,255,255,0.055)] sm:p-6"
      style={{
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${personality.accent} 22%, transparent)`,
      }}
    >
      <span
        className="pointer-events-none absolute inset-x-6 top-0 h-px opacity-70 transition-opacity duration-300 group-hover:opacity-100"
        style={{ backgroundColor: personality.accent }}
      />
      <span
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-100"
        style={{ backgroundColor: personality.glow }}
      />

      <div className="relative space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">
            {personality.emoji}
          </span>
          <div>
            <h3 className="font-display text-2xl font-medium">{personality.name}</h3>
            <p className="text-sm text-muted">{personality.tagline}</p>
          </div>
        </div>

        <p className="text-[15px] leading-7 text-foreground/70">{personalityDescriptions[personality.key]}</p>
      </div>
    </Link>
  )
}
