import type { StaticImageData } from 'next/image'
import angelCard from '@/assets/angel-card-v2.png'
import angelLoading from '@/assets/angel-loading.png'
import aristotleCard from '@/assets/aristotle-card-v2.png'
import aristotleLoading from '@/assets/aristotle-loading.png'
import auntieZhangCard from '@/assets/auntie-zhang-card-v2.png'
import auntieZhangLoading from '@/assets/auntie-zhang-loading.png'
import auntieZhangScene from '@/assets/auntie-zhang-scene.png'
import cottonCard from '@/assets/cotton-card-v2.png'
import cottonLoading from '@/assets/cotton-loading.png'
import cottonScene from '@/assets/cotton-scene.png'
import mingCard from '@/assets/ming-card-v2.png'
import mingLoading from '@/assets/ming-loading.png'
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

export const personalityLoadingScenes: Record<PersonalityKey, StaticImageData> = {
  cotton: cottonLoading,
  aristotle: aristotleLoading,
  'venerable-ming': mingLoading,
  angel: angelLoading,
  'auntie-zhang': auntieZhangLoading,
}
