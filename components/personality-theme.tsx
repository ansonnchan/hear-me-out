'use client'

import { useEffect } from 'react'
import { personalities } from '@/lib/personalities'
import { useVentStore } from '@/store/vent-store'

export function PersonalityTheme() {
  const activePersonality = useVentStore((state) => state.activePersonality)

  useEffect(() => {
    const personality = personalities[activePersonality]
    const root = document.documentElement

    root.style.setProperty('--accent', personality.accent)
    root.style.setProperty('--accent-soft', personality.accentSoft)
    root.style.setProperty('--glow', personality.glow)
    root.dataset.personality = personality.key
  }, [activePersonality])

  return null
}

