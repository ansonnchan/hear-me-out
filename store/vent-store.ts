'use client'

import { create } from 'zustand'
import type { CompressedContext } from '@/lib/ai/context-compressor'
import { defaultPersonality, type PersonalityKey } from '@/lib/personalities'

type ResponseMap = Partial<Record<PersonalityKey, string>>

export type VentSessionMessage = {
  index: number
  role: 'user' | 'assistant'
  content: string
  personality?: PersonalityKey
}

interface VentState {
  currentVentText: string
  currentVent: string
  activePersonality: PersonalityKey
  defaultPersonality: PersonalityKey
  responses: ResponseMap
  sessionMessages: VentSessionMessage[]
  compressedContext: CompressedContext | null
  safetyNote: string | null
  nextMessageIndex: number
  setCurrentVentText: (text: string) => void
  setCurrentVent: (text: string) => void
  setActivePersonality: (personality: PersonalityKey) => void
  setDefaultPersonality: (personality: PersonalityKey) => void
  setResponse: (personality: PersonalityKey, content: string) => void
  setResponses: (responses: ResponseMap) => void
  addSessionMessage: (message: Omit<VentSessionMessage, 'index'>) => void
  applyCompressedContext: (context: CompressedContext) => void
  setSafetyNote: (note: string | null) => void
  resetSession: () => void
}

export const useVentStore = create<VentState>((set) => ({
  currentVentText: '',
  currentVent: '',
  activePersonality: defaultPersonality,
  defaultPersonality,
  responses: {},
  sessionMessages: [],
  compressedContext: null,
  safetyNote: null,
  nextMessageIndex: 0,
  setCurrentVentText: (currentVentText) => set({ currentVentText }),
  setCurrentVent: (currentVent) => set({ currentVent }),
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
  addSessionMessage: (message) =>
    set((state) => ({
      nextMessageIndex: state.nextMessageIndex + 1,
      sessionMessages: [
        ...state.sessionMessages,
        {
          ...message,
          index: state.nextMessageIndex,
        },
      ],
    })),
  applyCompressedContext: (compressedContext) =>
    set((state) => ({
      compressedContext,
      sessionMessages: state.sessionMessages.filter(
        (message) => message.index > compressedContext.lastCompressedMessageIndex,
      ),
    })),
  setSafetyNote: (safetyNote) => set({ safetyNote }),
  resetSession: () =>
    set({
      currentVentText: '',
      currentVent: '',
      responses: {},
      sessionMessages: [],
      compressedContext: null,
      safetyNote: null,
      nextMessageIndex: 0,
    }),
}))
