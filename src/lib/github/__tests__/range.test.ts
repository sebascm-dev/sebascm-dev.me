import { describe, it, expect } from 'vitest'
import { addDays, DEFAULT_RANGE, getRangeWindows, madridDate, parseRange } from '../range'

describe('parseRange', () => {
  it('accepts every preset', () => {
    for (const key of ['7d', '30d', '90d', '12m']) {
      expect(parseRange(key)).toBe(key)
    }
  })

  it('falls back to 12m when the value is missing or invalid', () => {
    expect(DEFAULT_RANGE).toBe('12m')
    expect(parseRange(undefined)).toBe('12m')
    expect(parseRange('')).toBe('12m')
    expect(parseRange('1y')).toBe('12m')
  })

  it('uses the first value when the param is repeated', () => {
    expect(parseRange(['90d', '7d'])).toBe('90d')
  })
})

describe('madridDate', () => {
  it('returns the calendar day in Madrid, not in UTC (summer, UTC+2)', () => {
    // 22:30 UTC is already 00:30 of the next day in Madrid
    expect(madridDate(new Date('2026-09-14T22:30:00Z'))).toBe('2026-09-15')
    expect(madridDate(new Date('2026-09-14T21:59:00Z'))).toBe('2026-09-14')
  })

  it('handles winter time (UTC+1)', () => {
    expect(madridDate(new Date('2026-01-10T23:30:00Z'))).toBe('2026-01-11')
    expect(madridDate(new Date('2026-01-10T22:59:00Z'))).toBe('2026-01-10')
  })
})

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
    expect(addDays('2026-09-15', 0)).toBe('2026-09-15')
  })
})

describe('getRangeWindows', () => {
  const now = new Date('2026-09-15T10:00:00Z')

  it('builds a 7-day window ending today and the 7 days before it', () => {
    expect(getRangeWindows('7d', now)).toMatchObject({
      key: '7d',
      days: 7,
      current: { start: '2026-09-09', end: '2026-09-15' },
      previous: { start: '2026-09-02', end: '2026-09-08' },
    })
  })

  it('uses 365 days for 12m', () => {
    const windows = getRangeWindows('12m', now)
    expect(windows.days).toBe(365)
    expect(windows.current).toEqual({ start: '2025-09-16', end: '2026-09-15' })
    expect(windows.previous.end).toBe('2025-09-15')
  })

  it('fetches history from one day before the previous window, at UTC midnight', () => {
    const windows = getRangeWindows('30d', now)
    expect(windows.previous.start).toBe('2026-07-18')
    expect(windows.since).toBe('2026-07-17T00:00:00Z')
  })

  it('takes "today" in Madrid time', () => {
    const lateNightUtc = new Date('2026-09-14T23:30:00Z')
    expect(getRangeWindows('7d', lateNightUtc).current.end).toBe('2026-09-15')
  })
})
