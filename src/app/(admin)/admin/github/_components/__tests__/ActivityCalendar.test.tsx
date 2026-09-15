import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ActivityCalendar } from '../ActivityCalendar'
import type { DayCount } from '@/lib/github/types'

/** Days ending on 2026-09-15 (a Tuesday), with the given counts by date */
function makeDays(length: number, counts: Record<string, number> = {}): DayCount[] {
  const end = Date.parse('2026-09-15T00:00:00Z')
  return Array.from({ length }, (_, i) => {
    const date = new Date(end - (length - 1 - i) * 864e5).toISOString().slice(0, 10)
    return { date, count: counts[date] ?? 0 }
  })
}

describe('ActivityCalendar', () => {
  it('labels every day with its commits and date', () => {
    render(<ActivityCalendar days={makeDays(30, { '2026-09-14': 4 })} range="30d" />)

    expect(screen.getAllByRole('button', { name: /commits?, / })).toHaveLength(30)
    expect(screen.getByRole('button', { name: '4 commits, lunes, 14 de septiembre' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '0 commits, martes, 15 de septiembre' })).toBeInTheDocument()
  })

  it('shows a legend for week-column heatmaps', () => {
    render(<ActivityCalendar days={makeDays(90)} range="90d" />)

    expect(screen.getByText('Menos')).toBeInTheDocument()
    expect(screen.getByText('Más')).toBeInTheDocument()
  })

  it('shows the value and the date on hover and on keyboard focus', async () => {
    const user = userEvent.setup()
    render(<ActivityCalendar days={makeDays(30, { '2026-09-14': 4, '2026-09-10': 1 })} range="30d" />)
    const readout = screen.getByRole('status')

    await user.hover(screen.getByRole('button', { name: /14 de septiembre/ }))
    expect(readout).toHaveTextContent('4 commits')
    expect(readout).toHaveTextContent('lunes, 14 de septiembre')

    // A direct .focus() must run inside act() so React applies the state update before asserting
    act(() => screen.getByRole('button', { name: /10 de septiembre/ }).focus())
    expect(readout).toHaveTextContent('1 commit')
    expect(readout).toHaveTextContent('jueves, 10 de septiembre')
  })

  it('moves a week with left/right and a day with up/down', async () => {
    const user = userEvent.setup()
    render(<ActivityCalendar days={makeDays(30)} range="30d" />)

    screen.getByRole('button', { name: /lunes, 7 de septiembre/ }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: /lunes, 14 de septiembre/ })).toHaveFocus()

    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('button', { name: /domingo, 13 de septiembre/ })).toHaveFocus()

    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(screen.getByRole('button', { name: /martes, 15 de septiembre/ })).toHaveFocus()
  })

  it('starts scrolled to the most recent weeks when the grid overflows', () => {
    const scrollWidth = vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(900)
    try {
      const { container } = render(<ActivityCalendar days={makeDays(365)} range="12m" />)

      expect(container.querySelector('.overflow-x-auto')?.scrollLeft).toBe(900)
    } finally {
      scrollWidth.mockRestore()
    }
  })

  it('keeps a single day in the tab order', () => {
    render(<ActivityCalendar days={makeDays(30)} range="30d" />)

    const focusable = screen
      .getAllByRole('button', { name: /commits?, / })
      .filter((cell) => cell.getAttribute('tabindex') === '0')
    expect(focusable).toHaveLength(1)
  })

  it('renders seven labelled columns for the 7-day range', () => {
    render(<ActivityCalendar days={makeDays(7, { '2026-09-15': 2 })} range="7d" />)

    expect(screen.getAllByRole('button', { name: /commits?, / })).toHaveLength(7)
    expect(screen.getByText('mar 15')).toBeInTheDocument()
    expect(screen.queryByText('Menos')).not.toBeInTheDocument()
  })

  it('offers a table with only the days that have commits', async () => {
    const user = userEvent.setup()
    render(<ActivityCalendar days={makeDays(30, { '2026-09-14': 4, '2026-09-01': 2 })} range="30d" />)

    await user.click(screen.getByRole('button', { name: 'Ver como tabla' }))

    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows.map((row) => row.textContent)).toEqual(['lunes, 14 de septiembre4', 'martes, 1 de septiembre2'])
    expect(screen.getByRole('button', { name: 'Ver calendario' })).toBeInTheDocument()
  })
})
