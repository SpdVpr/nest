import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format price to Czech currency
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
  }).format(price)
}

// Format date to Czech format (date + time)
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('cs-CZ', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

// Format date only (no time)
export function formatDateOnly(date: string | Date): string {
  return new Intl.DateTimeFormat('cs-CZ', {
    dateStyle: 'medium',
  }).format(new Date(date))
}

// Format event date range: "25. 5. 2026 16:00 - 28. 5. 2026 22:00"
// Time is shown next to its respective date (arrival time on start date, departure time on end date)
export function formatEventRange(
  startDate: string | Date,
  endDate?: string | Date | null,
  startTime?: string | null,
  endTime?: string | null
): string {
  const startDateOnly = formatDateOnly(startDate)
  const startPart = startTime ? `${startDateOnly} ${startTime}` : startDateOnly

  if (!endDate) return startPart

  const endDateOnly = formatDateOnly(endDate)
  const endPart = endTime ? `${endDateOnly} ${endTime}` : endDateOnly

  return `${startPart} - ${endPart}`
}