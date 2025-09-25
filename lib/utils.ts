import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { OKRStatus } from '@/lib/types/okr'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Status mapping between UI (Spanish) and API (English)
export const STATUS_MAP_TO_API = {
  'no_iniciado': 'planning',
  'en_progreso': 'in_progress', 
  'completado': 'completed',
  'pausado': 'cancelled'
} as const

export const STATUS_MAP_FROM_API = {
  'planning': 'no_iniciado',
  'in_progress': 'en_progreso',
  'completed': 'completado', 
  'cancelled': 'pausado'
} as const

export function mapStatusToAPI(uiStatus: OKRStatus): string {
  return STATUS_MAP_TO_API[uiStatus]
}

export function mapStatusFromAPI(apiStatus: string): OKRStatus {
  return STATUS_MAP_FROM_API[apiStatus as keyof typeof STATUS_MAP_FROM_API] || 'no_iniciado'
}
