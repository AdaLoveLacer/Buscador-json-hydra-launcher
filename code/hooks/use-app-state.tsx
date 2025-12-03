import { create } from 'zustand'
import { persist, type StateStorage } from 'zustand/middleware'
import type { GogData } from '@/lib/types'

interface AppState {
  locale: string
  setLocale: (locale: string) => void
}

export const useAppState = create<AppState>()(
  persist(
    (set) => ({
      locale: 'pt-BR',
      setLocale: (locale: string) => set({ locale })
    }),
    {
      name: 'hydra-app-state',
      version: 1,
    }
  )
)