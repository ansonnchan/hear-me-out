'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { type ChineseQuote, getRandomQuote } from '@/lib/quotes'

export function QuoteDisplay() {
  const [quote, setQuote] = useState<ChineseQuote | null>(null)

  useEffect(() => {
    const initial = window.setTimeout(() => setQuote(getRandomQuote()), 0)
    const interval = window.setInterval(() => {
      setQuote((current) => getRandomQuote(current))
    }, 25000)
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(interval)
    }
  }, [])

  function refreshQuote() {
    setQuote((current) => getRandomQuote(current))
  }

  return (
    <section className="mx-auto flex min-h-[170px] max-w-2xl flex-col items-center justify-center py-8 text-center">
      <div className="flex min-h-[92px] items-center justify-center">
        <AnimatePresence mode="wait">
          {quote ? (
            <motion.div
              key={`${quote.english}-${quote.chinese}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-2"
            >
              <p className="font-display text-base leading-7 text-foreground/45">{quote.english}</p>
              <p className="font-cjk text-sm leading-6 text-foreground/35">{quote.chinese}</p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={refreshQuote}
        className="mt-4 inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs text-muted transition-colors duration-300 hover:text-foreground"
      >
        <RotateCcw size={13} aria-hidden="true" />
        Impart new wisdom
      </button>
    </section>
  )
}
