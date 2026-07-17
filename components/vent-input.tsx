'use client'

import { FormEvent, useEffect, useRef } from 'react'
import { Send } from 'lucide-react'
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
    const minHeight = compact ? 68 : 180
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.max(textarea.scrollHeight, minHeight)}px`
  }, [compact, fill, value])

  function submit(event?: FormEvent) {
    event?.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={submit} className={cn('space-y-2.5', fill && 'flex h-full min-h-0 flex-col')}>
      <div
        className={cn(
          'relative overflow-hidden rounded-[9px] border border-[#d8c5b0]/70 bg-[#fffaf0] transition-all duration-300',
          'shadow-[0_4px_12px_rgba(87,57,44,.06)] focus-within:border-[#aa8ad8] focus-within:shadow-[0_7px_20px_rgba(87,57,44,.1)]',
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
          placeholder="Write your thoughts..."
          className={cn(
            'w-full resize-none bg-transparent px-4 py-3 pr-12 text-sm leading-6 text-[#4f433b] outline-none placeholder:font-hand placeholder:text-[#a08d7f] disabled:opacity-70',
            compact ? 'min-h-[68px]' : 'min-h-[180px]',
            fill && 'h-full min-h-0 overflow-y-auto',
          )}
          rows={compact ? 2 : 6}
        />
        <div className="pointer-events-none absolute bottom-2 right-3 text-[9px] text-muted">
          {value.length.toLocaleString()}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="min-h-4 text-[10px] text-[#a15f59]">{error}</p>
        <Button type="submit" variant="primary" size="sm" disabled={isLoading} className="h-9 bg-[#aa8ad8] px-4 text-white shadow-[0_5px_14px_rgba(91,61,117,.2)] hover:bg-[#9876ca]">
          {isLoading ? 'Listening...' : 'Send'}
          <Send size={13} />
        </Button>
      </div>
    </form>
  )
}
