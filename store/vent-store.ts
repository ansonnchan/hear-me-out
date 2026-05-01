'use client'

import { create } from 'zustand'
import { defaultPersonality, type PersonalityKey } from '@/lib/personalities'

type ResponseMap = Partial<Record<PersonalityKey, string>>

interface VentState {
  activePersonality: PersonalityKey
  defaultPersonality: PersonalityKey
  sessionId: string | null
  responses: ResponseMap
  setActivePersonality: (personality: PersonalityKey) => void
  setDefaultPersonality: (personality: PersonalityKey) => void
  setSessionId: (sessionId: string | null) => void
  setResponse: (personality: PersonalityKey, content: string) => void
  setResponses: (responses: ResponseMap) => void
  resetSession: () => void
}

export const useVentStore = create<VentState>((set) => ({
  activePersonality: defaultPersonality,
  defaultPersonality,
  sessionId: null,
  responses: {},
  setActivePersonality: (activePersonality) => set({ activePersonality }),
  setDefaultPersonality: (defaultPersonality) => set({ defaultPersonality, activePersonality: defaultPersonality }),
  setSessionId: (sessionId) => set({ sessionId }),
  setResponse: (personality, content) =>
    set((state) => ({
      responses: {
        ...state.responses,
        [personality]: content,
      },
    })),
  setResponses: (responses) => set({ responses }),
  resetSession: () => set({ sessionId: null, responses: {} }),
}))

