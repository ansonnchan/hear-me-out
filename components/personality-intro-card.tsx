'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { personalityImages } from '@/lib/personality-assets'
import { personalities, type PersonalityKey } from '@/lib/personalities'

const descriptions: Record<PersonalityKey, string> = {
  cotton: 'Soft, gentle, and always believes in better tomorrows.',
  aristotle: 'Thinks deeply and questions everything with logic.',
  'venerable-ming': 'Calm as water, steady as the mountain.',
  angel: 'Kind, optimistic, and believes in the good in everything.',
  'auntie-zhang': 'Honest, direct, and tells you what you need to hear.',
}

export function PersonalityIntroCard({ personalityKey }: { personalityKey: PersonalityKey }) {
  const personality = personalities[personalityKey]

  return (
    <motion.article whileHover={{ y: -5 }} transition={{ type: 'spring', stiffness: 320, damping: 24 }} className="group min-w-[210px] overflow-hidden rounded-[12px] border border-[#cdbba8]/35 bg-[#fffaf0] shadow-[0_8px_22px_rgba(91,62,43,.09)]">
      <Link href={`/vent?personality=${personality.key}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#9e88bf]">
        <div className="relative h-[225px] overflow-hidden bg-[var(--accent-soft)]">
          <Image src={personalityImages[personality.key]} alt={`${personality.name}, an illustrated listener`} fill className="object-cover transition duration-700 group-hover:scale-[1.035]" sizes="220px" placeholder="blur" />
        </div>
        <div className="min-h-[132px] border-t border-[#d9c8b6]/40 bg-[#fffaf0] p-4">
          <h3 className="font-hand text-xl font-bold leading-tight text-[#493a32]">{personality.name}</h3>
          <p className="mt-2 text-xs leading-[1.55] text-[#6f6056]">{descriptions[personality.key]}</p>
        </div>
      </Link>
    </motion.article>
  )
}
