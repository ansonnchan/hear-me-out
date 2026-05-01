import { type ClassValue, clsx } from 'clsx'
import { format, formatDistanceToNow } from 'date-fns'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function firstWordsTitle(text: string) {
  const words = text.trim().split(/\s+/).slice(0, 6).join(' ')
  return `${words || 'Untitled'}…`
}

export function previewText(text: string, maxLength = 100) {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trim()}...`
}

export function formatSessionDate(date: string | Date) {
  return format(new Date(date), 'MMMM d, yyyy \'at\' h:mm a').replace(/\bAM\b/, 'am').replace(/\bPM\b/, 'pm')
}

export function formatRelativeDate(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}
