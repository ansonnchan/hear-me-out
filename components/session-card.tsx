import Link from 'next/link'
import { personalities, type PersonalityKey } from '@/lib/personalities'
import { formatRelativeDate, previewText } from '@/lib/utils'

interface SessionCardProps {
  id: string
  title: string | null
  originalText: string
  createdAt: string
  generatedPersonalities: PersonalityKey[]
}

export function SessionCard({ id, title, originalText, createdAt, generatedPersonalities }: SessionCardProps) {
  return (
    <Link
      href={`/session/${id}`}
      className="glass-panel group block rounded-[8px] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--accent)_38%,transparent)] hover:shadow-lift"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h2 className="font-display text-2xl font-medium text-foreground">{title || 'Untitled entry'}</h2>
          <p className="relative max-w-2xl overflow-hidden text-sm leading-6 text-muted">
            <span className="block [mask-image:linear-gradient(90deg,#000_78%,transparent)]">
              {previewText(originalText)}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3 text-sm text-muted">
          <span>{formatRelativeDate(createdAt)}</span>
          <span className="flex items-center gap-1.5">
            {generatedPersonalities.map((personality) => (
              <span key={personality} title={personalities[personality].name} aria-label={personalities[personality].name}>
                {personalities[personality].emoji}
              </span>
            ))}
          </span>
        </div>
      </div>
    </Link>
  )
}

