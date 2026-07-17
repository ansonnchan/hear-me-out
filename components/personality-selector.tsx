'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { personalityImages, personalityPortraits } from '@/lib/personality-assets'
import { recordClientMetric } from '@/lib/client-metrics'
import { personalities, personalityList, type PersonalityKey } from '@/lib/personalities'
import { cn } from '@/lib/utils'
import { useVentStore } from '@/store/vent-store'

interface PersonalitySelectorProps {
  value?: PersonalityKey | null
  onValueChange?: (personality: PersonalityKey) => void
  className?: string
  variant?: 'cards' | 'rail' | 'pills'
}

const shortDescriptions: Record<PersonalityKey, string> = {
  cotton: 'Soft, gentle, and always believes in better tomorrows.',
  aristotle: 'Thinks deeply and questions everything with logic.',
  'venerable-ming': 'Calm as water, steady as the mountain.',
  angel: 'Kind, optimistic, and believes in the good in everything.',
  'auntie-zhang': 'Honest, direct, and tells you what you need to hear.',
}

export function PersonalitySelector({ value, onValueChange, className, variant = 'pills' }: PersonalitySelectorProps) {
  const storeValue = useVentStore((state) => state.activePersonality)
  const setStoreValue = useVentStore((state) => state.setActivePersonality)
  const active = value === null ? null : value ?? storeValue

  function choose(personality: PersonalityKey) {
    if (personality !== active) recordClientMetric('personality_switch', { personality })
    setStoreValue(personality)
    onValueChange?.(personality)
  }

  if (variant === 'cards') {
    return (
      <div className={cn('grid auto-cols-[204px] grid-flow-col gap-3 overflow-x-auto px-1 pb-3 pt-1 [scrollbar-width:none] lg:h-full lg:min-h-0 lg:grid-flow-row lg:grid-cols-5 lg:content-start lg:items-start lg:gap-[18px] lg:overflow-visible [&::-webkit-scrollbar]:hidden', className)}>
        {personalityList.map((personality) => (
          <motion.button key={personality.key} type="button" onClick={() => choose(personality.key)} whileHover={{ y: -4 }} whileTap={{ scale: .985 }} className="group min-w-[204px] overflow-hidden rounded-[13px] border border-[#cdbba8]/40 bg-[#fffaf0] text-left shadow-[0_10px_24px_rgba(91,62,43,.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9e88bf] lg:min-w-0 lg:self-start">
            <span className="relative block h-[clamp(175px,24vh,244px)] overflow-hidden bg-[#e7ddd2]">
              <Image src={personalityImages[personality.key]} alt="" fill className="object-cover object-center transition duration-500 group-hover:scale-[1.035]" sizes="(max-width: 1024px) 204px, 260px" />
            </span>
            <span className="block min-h-[114px] border-t border-[#d9c8b6]/40 p-3.5">
              <span className="font-hand block text-lg font-bold leading-tight text-[#493a32]">{personality.name}</span>
              <span className="mt-1.5 block text-[10px] leading-[1.45] text-[#706157]">{shortDescriptions[personality.key]}</span>
            </span>
          </motion.button>
        ))}
      </div>
    )
  }

  if (variant === 'rail') {
    return (
      <div className={cn('flex items-center justify-center gap-2 overflow-x-auto border-b border-[#d8c6b2]/45 bg-[#eadfce]/55 px-3 py-2.5 [scrollbar-width:none] lg:h-full lg:flex-col lg:justify-start lg:border-b-0 lg:border-r lg:px-2.5 lg:py-4 [&::-webkit-scrollbar]:hidden', className)}>
        {personalityList.map((personality) => {
          const selected = active === personality.key
          return (
            <motion.button key={personality.key} type="button" onClick={() => choose(personality.key)} whileHover={{ scale: 1.07 }} whileTap={{ scale: .96 }} title={personality.name} aria-label={`Talk with ${personality.name}`} aria-pressed={selected} className={cn('relative h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 bg-[#fffaf0] shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9e88bf] lg:h-12 lg:w-12', selected ? 'border-[#8cae8f] ring-2 ring-[#8cae8f]/25' : 'border-white/80 opacity-80 hover:opacity-100')}>
              <Image src={personalityPortraits[personality.key]} alt="" fill className="object-cover object-top" sizes="48px" />
            </motion.button>
          )
        })}
      </div>
    )
  }

  return (
    <div className={cn('w-full overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}>
      <div className="mx-auto flex min-w-max justify-center gap-2 px-1">
        {personalityList.map((personality) => {
          const selected = active === personality.key
          return (
            <button key={personality.key} type="button" onClick={() => choose(personality.key)} className={cn('inline-flex h-12 items-center gap-2 rounded-full border px-2 pr-3 text-xs font-medium transition', selected ? 'border-[#9e88bf] bg-white shadow-md' : 'border-[#d8c6b2]/60 bg-white/55 text-muted hover:bg-white')}>
              <span className="relative h-8 w-8 overflow-hidden rounded-full"><Image src={personalityPortraits[personality.key]} alt="" fill className="object-cover object-top" sizes="32px" /></span>
              {personalities[personality.key].name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
