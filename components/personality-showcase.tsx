'use client'

import { KeyboardEvent, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PersonalityIntroCard } from '@/components/personality-intro-card'
import { personalityList } from '@/lib/personalities'

export function PersonalityShowcase() {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  function scrollByCard(direction: 'left' | 'right') {
    const currentIndex = selectedIndex ?? 0
    const nextIndex =
      direction === 'left'
        ? Math.max(0, currentIndex - 1)
        : Math.min(personalityList.length - 1, currentIndex + 1)

    setSelectedIndex(nextIndex)
    scrollRef.current?.scrollBy({
      left: direction === 'left' ? -330 : 330,
      behavior: 'smooth',
    })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      scrollByCard('left')
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      scrollByCard('right')
    }
  }

  return (
    <div className="relative" onKeyDown={handleKeyDown}>
      <div
        ref={scrollRef}
        className="mx-auto flex max-w-full snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-2 pb-8 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {personalityList.map((personality, index) => (
          <PersonalityIntroCard
            key={personality.key}
            personalityKey={personality.key}
            isSelected={selectedIndex === index}
            onSelect={() => setSelectedIndex(index)}
          />
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
