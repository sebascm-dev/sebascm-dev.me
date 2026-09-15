import { describe, it, expect } from 'vitest'
import {
  formatChange,
  formatDayLong,
  formatDayMonth,
  formatNumber,
  formatPercent,
  formatRelative,
  plural,
  PREVIOUS_RANGE_LABELS,
  RANGE_LABELS,
  RANGE_SHORT_LABELS,
} from '../format'

describe('plural', () => {
  it('uses the singular only for exactly one', () => {
    expect(plural(1, 'día', 'días')).toBe('1 día')
    expect(plural(0, 'día', 'días')).toBe('0 días')
    expect(plural(4, 'día', 'días')).toBe('4 días')
  })
})

describe('formatNumber', () => {
  it('uses Spanish digit grouping', () => {
    expect(formatNumber(232)).toBe('232')
    expect(formatNumber(12840)).toBe('12.840')
  })
})

describe('formatPercent', () => {
  it('formats a 0…1 share with one decimal and a comma', () => {
    expect(formatPercent(0.967)).toBe('96,7%')
    expect(formatPercent(0.009)).toBe('0,9%')
    expect(formatPercent(1)).toBe('100,0%')
  })
})

describe('formatChange', () => {
  it('writes a signed percentage for ordinary changes', () => {
    expect(formatChange(15, 12)).toBe('+25%')
    expect(formatChange(6, 10)).toBe('−40%')
    expect(formatChange(5, 5)).toBe('0%')
    expect(formatChange(99, 10)).toBe('+890%')
  })

  // "+23.100%" is correct but unreadable: a multiplier says the same thing clearly
  it('switches to a multiplier once the change is ten-fold or more', () => {
    expect(formatChange(100, 10)).toBe('×10')
    expect(formatChange(232, 1)).toBe('×232')
    expect(formatChange(12840, 1)).toBe('×12.840')
  })

  it('has nothing to compare against when the previous period is empty', () => {
    expect(formatChange(3, 0)).toBeNull()
  })
})

describe('formatRelative', () => {
  const now = new Date('2026-09-15T10:00:00Z')

  it('describes very recent moments without a number', () => {
    expect(formatRelative('2026-09-15T09:59:40Z', now)).toBe('hace unos segundos')
  })

  it('uses minutes, hours, days and months', () => {
    expect(formatRelative('2026-09-15T09:58:00Z', now)).toBe('hace 2 minutos')
    expect(formatRelative('2026-09-15T07:00:00Z', now)).toBe('hace 3 horas')
    expect(formatRelative('2026-09-14T09:00:00Z', now)).toBe('ayer')
    expect(formatRelative('2026-09-13T10:00:00Z', now)).toBe('anteayer')
    expect(formatRelative('2026-09-10T10:00:00Z', now)).toBe('hace 5 días')
    expect(formatRelative('2026-04-15T10:00:00Z', now)).toBe('hace 5 meses')
    expect(formatRelative('2024-09-01T10:00:00Z', now)).toBe('hace 2 años')
  })
})

describe('day formatting', () => {
  it('writes the full weekday and date in Spanish', () => {
    expect(formatDayLong('2026-09-14')).toBe('lunes, 14 de septiembre')
  })

  it('writes the day and month', () => {
    expect(formatDayMonth('2026-09-05')).toBe('5 de septiembre')
  })
})

describe('range labels', () => {
  it('names every range and its previous period', () => {
    expect(RANGE_LABELS['30d']).toBe('últimos 30 días')
    expect(RANGE_LABELS['12m']).toBe('últimos 12 meses')
    expect(RANGE_SHORT_LABELS['7d']).toBe('7 días')
    expect(PREVIOUS_RANGE_LABELS['30d']).toBe('30 días anteriores')
    expect(PREVIOUS_RANGE_LABELS['12m']).toBe('12 meses anteriores')
  })
})
