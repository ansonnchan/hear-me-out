'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PenLine } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Disclaimer } from '@/components/disclaimer'
import { PersonalityTheme } from '@/components/personality-theme'

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/vent', label: 'vent.ai' },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <>
      <PersonalityTheme />
      <div className="min-h-screen">
        <header className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Link href="/" className="group inline-flex items-center gap-3" aria-label="vent.ai home">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--accent)] transition-colors duration-300 group-hover:border-[var(--accent)]">
              <PenLine size={17} strokeWidth={1.8} />
            </span>
            <span className="font-display text-xl font-medium text-foreground">vent.ai</span>
          </Link>

          <nav className="flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-[var(--color-border)] bg-[rgba(255,255,255,0.035)] p-1 backdrop-blur-xl">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-sm text-muted transition-all duration-300 hover:text-foreground sm:px-4',
                    isActive && 'bg-[var(--color-surface-strong)] text-foreground shadow-[0_0_28px_var(--glow)]',
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </header>

        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
            transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto w-full max-w-6xl px-5 pb-10 sm:px-8"
          >
            {children}
          </motion.main>
        </AnimatePresence>

        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <Disclaimer />
        </div>
      </div>
    </>
  )
}
