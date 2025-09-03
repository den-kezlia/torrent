import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function prettyStatus(status: string | null | undefined): string {
  switch (status) {
    case 'VISITED':
      return 'Visited'
    case 'IN_PROGRESS':
    case 'in_progress':
      return 'In progress'
    case 'PLANNED':
    case 'planned':
      return 'Planned'
    default:
      return '—'
  }
}

export function normalizeStatus(status: string | null | undefined): 'PLANNED' | 'IN_PROGRESS' | 'VISITED' | null {
  if (!status) return null
  const s = String(status).toUpperCase()
  if (s === 'IN_PROGRESS' || s === 'IN-PROGRESS') return 'IN_PROGRESS'
  if (s === 'VISITED') return 'VISITED'
  if (s === 'PLANNED') return 'PLANNED'
  return null
}
