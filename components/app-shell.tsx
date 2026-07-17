'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Disclaimer } from '@/components/disclaimer'
import { PersonalityTheme } from '@/components/personality-theme'

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/personalities', label: 'Personalities' },
  { href: '/vent', label: 'Talk now' },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLanding = pathname === '/'

  return (
    <>
      <PersonalityTheme />
      <div className="min-h-screen">
        {!isLanding ? <header className="sticky top-0 z-50 border-b border-[#b99e82]/15 bg-[#fffaf0]/90 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-5 py-3 sm:px-8 lg:px-10">
            <Link href="/" className="group inline-flex items-center gap-2.5" aria-label="hear me out home">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#b99e82]/25 bg-white/65 text-[#9c79ca] transition group-hover:-rotate-6">
                <Sparkles size={16} strokeWidth={1.8} />
              </span>
              <span>
                <span className="font-hand block text-[20px] font-bold leading-none text-[#493a32]">hear me out</span>
                <span className="block text-[8px] font-semibold uppercase tracking-[0.2em] text-[#8e796a]">from vent.ai</span>
              </span>
            </Link>

            <nav className="flex items-center gap-1 rounded-full border border-[#b99e82]/15 bg-white/45 p-1">
              {navItems.map((item, index) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-medium text-[#7d6a5e] transition hover:bg-white/75 hover:text-[#493a32] sm:px-4',
                      isActive && 'bg-white text-[#493a32] shadow-sm',
                      index === 1 && 'hidden sm:block',
                      index === 2 && 'bg-[#a98ad6] text-white hover:bg-[#9674c8] hover:text-white',
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </header> : null}

        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'mx-auto w-full',
              isLanding
                ? 'max-w-[1600px] p-2 sm:p-3 lg:p-4'
                : 'max-w-[1440px] px-4 pb-8 pt-4 sm:px-7 sm:pt-6 lg:px-10',
            )}
          >
            {children}
          </motion.main>
        </AnimatePresence>

        {!isLanding ? <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8"><Disclaimer /></div> : null}
      </div>
    </>
  )
}
