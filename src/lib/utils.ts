import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely convert a date value to ISO string.
 * When using Prisma, dates come back as Date objects.
 * When using Supabase REST API, dates come back as strings.
 * This helper handles both cases.
 */
export function toISOString(value: Date | string | null | undefined): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return new Date(value).toISOString()
  return null
}
