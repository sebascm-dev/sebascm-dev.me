// Spanish formatting helpers for the GitHub dashboard. Pure: safe on the server and the client.
import type { RangeKey } from './types'

export const RANGE_LABELS: Record<RangeKey, string> = {
  '7d': 'últimos 7 días',
  '30d': 'últimos 30 días',
  '90d': 'últimos 90 días',
  '12m': 'últimos 12 meses',
}

export const RANGE_SHORT_LABELS: Record<RangeKey, string> = {
  '7d': '7 días',
  '30d': '30 días',
  '90d': '90 días',
  '12m': '12 meses',
}

export const PREVIOUS_RANGE_LABELS: Record<RangeKey, string> = {
  '7d': '7 días anteriores',
  '30d': '30 días anteriores',
  '90d': '90 días anteriores',
  '12m': '12 meses anteriores',
}

const numberFormatter = new Intl.NumberFormat('es-ES')
const relativeFormatter = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
const dayLongFormatter = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})
const dayMonthFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})

export function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

/** "1 día" / "4 días" */
export function plural(count: number, singular: string, pluralForm: string): string {
  return `${formatNumber(count)} ${count === 1 ? singular : pluralForm}`
}

/** 0.967 -> "96,7%" */
export function formatPercent(share: number): string {
  return `${(share * 100).toFixed(1).replace('.', ',')}%`
}

/**
 * "+25%", "−40%", or "×232" once the change is ten-fold or more:
 * past that point a percentage ("+23.100%") is correct but unreadable.
 * Null when there is no previous period to compare against.
 */
export function formatChange(current: number, previous: number): string | null {
  if (previous === 0) return null
  const ratio = current / previous
  if (ratio >= 10) return `×${formatNumber(Math.round(ratio))}`

  const percent = Math.round((ratio - 1) * 100)
  if (percent === 0) return '0%'
  return `${percent > 0 ? '+' : '−'}${formatNumber(Math.abs(percent))}%`
}

/** "hace 3 horas", "ayer", "hace 5 meses" */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const seconds = Math.round((now.getTime() - Date.parse(iso)) / 1000)
  if (seconds < 45) return 'hace unos segundos'

  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return relativeFormatter.format(-minutes, 'minute')

  const hours = Math.round(minutes / 60)
  if (hours < 24) return relativeFormatter.format(-hours, 'hour')

  const days = Math.round(hours / 24)
  if (days < 30) return relativeFormatter.format(-days, 'day')

  const months = Math.round(days / 30)
  if (months < 12) return relativeFormatter.format(-months, 'month')

  return relativeFormatter.format(-Math.round(days / 365), 'year')
}

/** "2026-09-14" -> "lunes, 14 de septiembre" */
export function formatDayLong(date: string): string {
  return dayLongFormatter.format(new Date(`${date}T12:00:00Z`))
}

/** "2026-09-05" -> "5 de septiembre" */
export function formatDayMonth(date: string): string {
  return dayMonthFormatter.format(new Date(`${date}T12:00:00Z`))
}
