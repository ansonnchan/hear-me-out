'use client'

import { FormEvent, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface VentInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isLoading?: boolean
  error?: string | null
  compact?: boolean
  fill?: boolean
}

export function VentInput({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  error,
  compact = false,
  fill = false,
}: VentInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    if (fill) return
    const minHeight = compact ? 160 : 240
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.max(textarea.scrollHeight, minHeight)}px`
  }, [compact, fill, value])

  function submit(event?: FormEvent) {
    event?.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={submit} className={cn('space-y-4', fill && 'flex h-full min-h-0 flex-col')}>
      <div
        className={cn(
          'glass-panel relative overflow-hidden rounded-[8px] transition-all duration-300',
          'focus-within:border-[var(--accent)] focus-within:shadow-[0_0_58px_var(--glow)]',
          fill && 'flex min-h-0 flex-1',
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          disabled={isLoading}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault()
              onSubmit()
            }
          }}
          placeholder="What's on your mind today?"
          className={cn(
            'w-full resize-none bg-transparent px-6 py-6 text-lg leading-8 text-foreground outline-none placeholder:text-foreground/30 disabled:opacity-70 sm:px-8 sm:py-8 sm:text-xl',
            compact ? 'min-h-[160px]' : 'min-h-[240px]',
            fill && 'h-full min-h-0 overflow-y-auto',
          )}
          rows={6}
        />
        <div className="pointer-events-none absolute bottom-4 right-5 text-xs text-muted">
          {value.length.toLocaleString()}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-h-5 text-sm text-[var(--accent)]">{error}</p>
        <Button type="submit" variant="primary" size="lg" disabled={isLoading}>
          {isLoading ? 'Listening...' : 'Let it out'}
        </Button>
      </div>
    </form>
  )
}
