'use client'

import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PersonalityIntroCard } from '@/components/personality-intro-card'
import { personalityList } from '@/lib/personalities'

export function PersonalityShowcase() {
  const scrollRef = useRef<HTMLDivElement | null>(null)

  function scrollByCard(direction: 'left' | 'right') {
    scrollRef.current?.scrollBy({
      left: direction === 'left' ? -330 : 330,
      behavior: 'smooth',
    })
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="mx-auto flex max-w-full snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {personalityList.map((personality) => (
          <PersonalityIntroCard key={personality.key} personalityKey={personality.key} />
        ))}
      </div>

      <div className="mt-4 hidden justify-center gap-3 sm:flex">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => scrollByCard('left')}
          aria-label="Scroll personality cards left"
        >
          <ChevronLeft size={17} aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => scrollByCard('right')}
          aria-label="Scroll personality cards right"
        >
          <ChevronRight size={17} aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
