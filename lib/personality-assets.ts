import type { StaticImageData } from 'next/image'
import angel from '@/assets/angel.jpg'
import angelTransparent from '@/assets/angel_transparent.jpg'
import aristotle from '@/assets/aristotle.jpg'
import aristotleTransparent from '@/assets/aristotle_transparent.jpg'
import auntieZhang from '@/assets/auntiezhang.jpg'
import auntieZhangTransparent from '@/assets/auntiezhang_transparent.jpg'
import cotton from '@/assets/cotton.jpg'
import cottonTransparent from '@/assets/cotton_transparent.jpg'
import ming from '@/assets/ming.jpg'
import mingTransparent from '@/assets/ming_transparent.jpg'
import type { PersonalityKey } from '@/lib/personalities'

export const personalityImages: Record<PersonalityKey, StaticImageData> = {
  cotton,
  aristotle,
  'venerable-ming': ming,
  angel,
  'auntie-zhang': auntieZhang,
}

export const personalityAtmospheres: Record<PersonalityKey, StaticImageData> = {
  cotton: cottonTransparent,
  aristotle: aristotleTransparent,
  'venerable-ming': mingTransparent,
  angel: angelTransparent,
  'auntie-zhang': auntieZhangTransparent,
}
