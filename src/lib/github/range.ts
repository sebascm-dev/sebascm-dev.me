// Range presets and calendar-day windows. Pure: safe on the server and the client.
import type { RangeKey, RangeWindows } from './types'

export const RANGE_KEYS: readonly RangeKey[] = ['7d', '30d', '90d', '12m']
export const DEFAULT_RANGE: RangeKey = '30d'
export const TIME_ZONE = 'Europe/Madrid'

export const RANGE_DAYS: Record<RangeKey, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '12m': 365,
}

const madridDayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Reads `?range`; anything missing or unknown falls back to the default */
export function parseRange(value: string | string[] | undefined): RangeKey {
  const raw = Array.isArray(value) ? value[0] : value
  return RANGE_KEYS.includes(raw as RangeKey) ? (raw as RangeKey) : DEFAULT_RANGE
}

/** Calendar day (YYYY-MM-DD) of an instant, in Madrid time */
export function madridDate(instant: Date): string {
  const parts = madridDayFormatter.formatToParts(instant)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** Adds whole days to a YYYY-MM-DD date. UTC arithmetic, so DST never shifts it */
export function addDays(date: string, amount: number): string {
  const ms = Date.parse(`${date}T00:00:00Z`) + amount * 864e5
  return new Date(ms).toISOString().slice(0, 10)
}

/**
 * Current window: the last N days ending today (Madrid), inclusive.
 * Previous window: the N days right before it, used for the delta.
 */
export function getRangeWindows(key: RangeKey, now: Date = new Date()): RangeWindows {
  const days = RANGE_DAYS[key]
  const today = madridDate(now)
  const currentStart = addDays(today, -(days - 1))
  const previousStart = addDays(currentStart, -days)

  return {
    key,
    days,
    current: { start: currentStart, end: today },
    previous: { start: previousStart, end: addDays(currentStart, -1) },
    // One extra day before the previous window: Madrid is ahead of UTC, so a
    // UTC-midnight bound on the exact day could miss its first hours.
    // Derivations filter by Madrid day afterwards.
    since: `${addDays(previousStart, -1)}T00:00:00Z`,
  }
}
