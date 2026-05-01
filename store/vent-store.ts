'use client'

import { create } from 'zustand'
import { defaultPersonality, type PersonalityKey } from '@/lib/personalities'

type ResponseMap = Partial<Record<PersonalityKey, string>>

interface VentState {
  currentVentText: string
  activePersonality: PersonalityKey
  defaultPersonality: PersonalityKey
  responses: ResponseMap
  setCurrentVentText: (text: string) => void
  setActivePersonality: (personality: PersonalityKey) => void
  setDefaultPersonality: (personality: PersonalityKey) => void
  setResponse: (personality: PersonalityKey, content: string) => void
  setResponses: (responses: ResponseMap) => void
  resetSession: () => void
}

export const useVentStore = create<VentState>((set) => ({
  currentVentText: '',
  activePersonality: defaultPersonality,
  defaultPersonality,
  responses: {},
  setCurrentVentText: (currentVentText) => set({ currentVentText }),
  setActivePersonality: (activePersonality) => set({ activePersonality }),
  setDefaultPersonality: (defaultPersonality) => set({ defaultPersonality, activePersonality: defaultPersonality }),
  setResponse: (personality, content) =>
    set((state) => ({
      responses: {
        ...state.responses,
        [personality]: content,
      },
    })),
  setResponses: (responses) => set({ responses }),
  resetSession: () => set({ currentVentText: '', responses: {} }),
}))
