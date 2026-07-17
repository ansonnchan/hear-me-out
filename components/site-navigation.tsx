'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/personalities', label: 'Personalities' },
  { href: '/vent', label: 'Talk now' },
]

export function SiteNavigation({ overImage = false }: { overImage?: boolean }) {
  const pathname = usePathname()

  return (
    <nav className={cn(
      'flex items-center gap-1 rounded-full p-1 text-xs font-medium sm:text-sm',
      overImage ? 'bg-[#3c2a23]/18 backdrop-blur-[3px]' : 'border border-[#b99e82]/15 bg-white/45',
    )}>
      {navItems.map((item) => {
        const isActive = pathname === item.href

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'rounded-full px-3 py-1.5 transition sm:px-4',
              overImage
                ? 'text-white/80 hover:bg-white/12 hover:text-white'
                : 'text-[#7d6a5e] hover:bg-white/75 hover:text-[#493a32]',
              isActive && 'bg-[#9e88bf] text-white shadow-[0_3px_10px_rgba(74,51,40,.18)] hover:bg-[#8f78b2] hover:text-white',
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
