import type { StaticImageData } from 'next/image'
import angelCard from '@/assets/angel-card-v2.png'
import aristotleCard from '@/assets/aristotle-card-v2.png'
import auntieZhangCard from '@/assets/auntie-zhang-card-v2.png'
import auntieZhangScene from '@/assets/auntie-zhang-scene.png'
import cottonCard from '@/assets/cotton-card-v2.png'
import cottonScene from '@/assets/cotton-scene.png'
import mingCard from '@/assets/ming-card-v2.png'
import mingScene from '@/assets/ming-scene.png'
import type { PersonalityKey } from '@/lib/personalities'
import angelScene from '@/assets/angel-scene.png'
import aristotleScene from '@/assets/aristotle-scene.png'

export const personalityImages: Record<PersonalityKey, StaticImageData> = {
  cotton: cottonCard,
  aristotle: aristotleCard,
  'venerable-ming': mingCard,
  angel: angelCard,
  'auntie-zhang': auntieZhangCard,
}

export const personalityPortraits: Record<PersonalityKey, StaticImageData> = {
  ...personalityImages,
}

export const personalityScenes: Record<PersonalityKey, StaticImageData> = {
  cotton: cottonScene,
  aristotle: aristotleScene,
  'venerable-ming': mingScene,
  angel: angelScene,
  'auntie-zhang': auntieZhangScene,
}
