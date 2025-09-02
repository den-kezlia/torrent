import { create } from 'zustand'

export type FiltersState = {
  search: string
  status?: 'PLANNED' | 'IN_PROGRESS' | 'VISITED'
  hasPhotos?: boolean
  hasNotes?: boolean
  bbox?: [number, number, number, number]
}

type Store = FiltersState & {
  set: (p: Partial<FiltersState>) => void
  reset: () => void
}

const initial: FiltersState = { search: '' }

export const useFilters = create<Store>((set) => ({
  ...initial,
  set: (p) => set((s) => ({ ...s, ...p })),
  reset: () => set({ ...initial })
}))
