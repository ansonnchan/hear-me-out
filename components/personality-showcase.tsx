'use client'

import { PersonalityIntroCard } from '@/components/personality-intro-card'
import { personalityList } from '@/lib/personalities'

export function PersonalityShowcase() {
  return (
    <div className="mx-auto grid max-w-[1160px] auto-cols-[210px] grid-flow-col gap-3 overflow-x-auto px-1 pb-4 pt-2 [scrollbar-width:none] lg:grid-flow-row lg:grid-cols-5 lg:overflow-visible [&::-webkit-scrollbar]:hidden">
      {personalityList.map((personality) => (
        <PersonalityIntroCard key={personality.key} personalityKey={personality.key} />
      ))}
    </div>
  )
}
