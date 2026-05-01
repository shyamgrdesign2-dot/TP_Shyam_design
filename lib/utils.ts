import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function safeClipboardWrite(text: string) {
  try { navigator.clipboard?.writeText(text) } catch { /* permission denied */ }
}
