'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { type ChineseQuote, getRandomQuote } from '@/lib/quotes'

export function QuoteDisplay() {
  const [quote, setQuote] = useState<ChineseQuote | null>(null)

  useEffect(() => {
    const initial = window.setTimeout(() => setQuote(getRandomQuote()), 0)
    const interval = window.setInterval(() => setQuote(getRandomQuote()), 60000)
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(interval)
    }
  }, [])

  return (
    <section className="mx-auto flex min-h-[116px] max-w-2xl items-center justify-center py-8 text-center">
      <AnimatePresence mode="wait">
        {quote ? (
          <motion.div
            key={`${quote.english}-${quote.chinese}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-2"
          >
            <p className="font-display text-base leading-7 text-foreground/45">{quote.english}</p>
            <p className="font-cjk text-sm leading-6 text-foreground/35">{quote.chinese}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  )
}
