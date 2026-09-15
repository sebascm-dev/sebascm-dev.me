'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { IconCalendar, IconTable } from '@tabler/icons-react'
import { activityLevel, weekdayIndex } from '@/lib/github/activity'
import { formatDayLong, plural } from '@/lib/github/format'
import type { DayCount, RangeKey } from '@/lib/github/types'

// Ordinal ramp validated with the dataviz checker against the #0d0d0d surface.
// Index 0 is "no commits" (neutral, not a data color).
const LEVEL_COLORS = ['#1a1a1a', '#11606d', '#0e8394', '#17aec2', '#22d3ee'] as const

const LEGEND_SWATCH = 12
const CELL_GAP = 3
// Below this cell width the week grid scrolls horizontally instead of shrinking (12m on a phone)
const MIN_CELL = 10
/** Weekday label column (12px) + gap (8px) */
const LABEL_COLUMN = 20

const BAR_COLOR = '#22d3ee'
const BAR_ACTIVE_COLOR = '#67e8f9'
/** Zero-commit days keep a visible stub so every day has a place on the axis */
const BAR_EMPTY_COLOR = '#262626'
// Below this bar width the chart scrolls horizontally instead of shrinking (90d on a phone)
const MIN_BAR = 4
/** Minimum distance, in bars, between two axis labels so they never overlap */
const MIN_LABEL_GAP = 5

const ROW_LABELS = ['L', '', 'X', '', 'V', '', 'D']
const WEEKDAY_SHORT = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']
const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic']

/**
 * - strip: 7 days side by side (7d)
 * - bars: one vertical bar per day, height = commits (30d, 90d)
 * - weeks: GitHub-style heatmap, weeks as columns and weekdays as rows (12m)
 */
type Layout = 'strip' | 'bars' | 'weeks'

const LAYOUTS: Record<RangeKey, Layout> = { '7d': 'strip', '30d': 'bars', '90d': 'bars', '12m': 'weeks' }

// Arrow keys follow what is visually adjacent in each layout
const MOVES: Record<Layout, Record<string, number>> = {
  strip: { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 1, ArrowUp: -1 },
  bars: { ArrowRight: 1, ArrowLeft: -1 },
  weeks: { ArrowRight: 7, ArrowLeft: -7, ArrowDown: 1, ArrowUp: -1 },
}

interface ActivityCalendarProps {
  days: DayCount[]
  range: RangeKey
}

const labelFor = (day: DayCount) => `${plural(day.count, 'commit', 'commits')}, ${formatDayLong(day.date)}`
/** "7 sept" */
const shortDate = (date: string) => `${Number(date.slice(8, 10))} ${MONTH_SHORT[Number(date.slice(5, 7)) - 1]}`

export function ActivityCalendar({ days, range }: ActivityCalendarProps) {
  const [view, setView] = useState<'calendar' | 'table'>('calendar')
  const [activeIndex, setActiveIndex] = useState(Math.max(0, days.length - 1))
  const [highlighted, setHighlighted] = useState<number | null>(null)
  const cells = useRef<(HTMLButtonElement | null)[]>([])
  const scroller = useRef<HTMLDivElement>(null)

  // When the grid is wider than the card (12m on a phone), start scrolled to the
  // most recent weeks, as GitHub does: today matters more than last October.
  useEffect(() => {
    const element = scroller.current
    if (element) element.scrollLeft = element.scrollWidth
  }, [range, view])

  const layout = LAYOUTS[range]
  const max = days.reduce((highest, day) => Math.max(highest, day.count), 0)
  const shownDay = highlighted === null ? null : days[highlighted]
  const activeDays = days.filter((day) => day.count > 0)
  // Blank slots before the first day so that every column (or row) starts on a Monday
  const leadingBlanks = days.length > 0 ? weekdayIndex(days[0].date) : 0
  const weekCount = Math.ceil((leadingBlanks + days.length) / 7)

  function focusDay(index: number) {
    const clamped = Math.min(days.length - 1, Math.max(0, index))
    setActiveIndex(clamped)
    cells.current[clamped]?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      focusDay(event.key === 'Home' ? 0 : days.length - 1)
      return
    }
    const delta = MOVES[layout][event.key]
    if (delta === undefined) return
    event.preventDefault()
    focusDay(index + delta)
  }

  /** Shared a11y and interaction wiring for every focusable day */
  function dayProps(day: DayCount, index: number) {
    return {
      key: day.date,
      ref: (element: HTMLButtonElement | null) => {
        cells.current[index] = element
      },
      type: 'button' as const,
      'aria-label': labelFor(day),
      tabIndex: index === activeIndex ? 0 : -1,
      onFocus: () => {
        setActiveIndex(index)
        setHighlighted(index)
      },
      onMouseEnter: () => setHighlighted(index),
      onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => handleKeyDown(event, index),
    }
  }

  function renderCell(day: DayCount, index: number, className: string) {
    const { key, ...props } = dayProps(day, index)
    return (
      <button
        key={key}
        {...props}
        className={`${className} cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan-400`}
        style={{ backgroundColor: LEVEL_COLORS[activityLevel(day.count, max)] }}
      />
    )
  }

  function renderStrip() {
    return (
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, index) => (
          <div key={day.date} className="flex flex-col items-center gap-1.5">
            {renderCell(day, index, 'h-10 w-full rounded-md')}
            <span className="text-xs text-gray-400">
              {WEEKDAY_SHORT[weekdayIndex(day.date)]} {Number(day.date.slice(8, 10))}
            </span>
          </div>
        ))}
      </div>
    )
  }

  function renderBars() {
    const gap = days.length > 45 ? 2 : 4
    const gridColumns = `repeat(${days.length}, minmax(0, 1fr))`
    // 30d: every Monday ("7 sept"); 90d: the first day of each month ("ago")
    const axisLabels = days
      .map((day, index) => ({ day, index }))
      .filter(({ day }) => (range === '30d' ? weekdayIndex(day.date) === 0 : day.date.endsWith('-01')))
      .filter(({ index }, position, labels) => position === 0 || index - labels[position - 1].index >= MIN_LABEL_GAP)

    return (
      <div className="flex gap-2">
        {/* Outside the scroller, so the scale stays visible while the bars scroll (90d on a phone).
            mt-2 matches the scroller's pt-2, which leaves room for the half-height label overhang. */}
        <div aria-hidden="true" className="relative mt-2 h-40 w-6 shrink-0 text-right text-[10px] leading-none text-gray-400">
          {max > 0 && <span className="absolute right-0 top-0 -translate-y-1/2">{max}</span>}
          <span className="absolute bottom-0 right-0 translate-y-1/2">0</span>
        </div>

        <div ref={scroller} className="min-w-0 flex-1 overflow-x-auto pb-1 pt-2">
          <div style={{ minWidth: days.length * (MIN_BAR + gap) }}>
            <div className="relative h-40 border-b border-[#262626]">
              {/* Guides at the busiest day and at half of it */}
              <span aria-hidden="true" className="absolute inset-x-0 top-0 border-t border-dashed border-[#1f1f1f]" />
              <span aria-hidden="true" className="absolute inset-x-0 top-1/2 border-t border-dashed border-[#1f1f1f]" />
              <div className="relative grid h-full" style={{ gridTemplateColumns: gridColumns, columnGap: gap }}>
                {days.map((day, index) => {
                  const { key, ...props } = dayProps(day, index)
                  const isActive = highlighted === index
                  return (
                    <button
                      key={key}
                      {...props}
                      className="group flex h-full cursor-pointer items-end rounded-sm hover:bg-white/[0.03] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan-400"
                    >
                      <span
                        data-bar
                        className="block min-h-[2px] w-full rounded-t-[2px] transition-colors duration-150"
                        style={{
                          height: `${max === 0 ? 0 : (day.count / max) * 100}%`,
                          backgroundColor:
                            day.count === 0 ? BAR_EMPTY_COLOR : isActive ? BAR_ACTIVE_COLOR : BAR_COLOR,
                        }}
                      />
                    </button>
                  )
                })}
              </div>
            </div>
            <div
              aria-hidden="true"
              className="mt-1.5 grid h-3 text-[10px] leading-none text-gray-400"
              style={{ gridTemplateColumns: gridColumns, columnGap: gap }}
            >
              {axisLabels.map(({ day, index }) => (
                <span key={day.date} className="whitespace-nowrap" style={{ gridColumnStart: index + 1 }}>
                  {range === '30d' ? shortDate(day.date) : MONTH_SHORT[Number(day.date.slice(5, 7)) - 1]}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  function renderWeeks() {
    const gridColumns = `repeat(${weekCount}, minmax(0, 1fr))`
    const monthLabels = days
      .map((day, index) => ({ day, column: Math.floor((leadingBlanks + index) / 7) }))
      .filter(({ day }, index) => day.date.endsWith('-01') || index === 0)
      .filter(({ column }, index, labels) => index === labels.length - 1 || labels[index + 1].column - column >= 3)

    return (
      <div ref={scroller} className="overflow-x-auto pb-1">
        <div className="flex gap-2" style={{ minWidth: LABEL_COLUMN + weekCount * (MIN_CELL + CELL_GAP) }}>
          <div aria-hidden="true" className="flex w-3 shrink-0 flex-col text-[10px] leading-none text-gray-400">
            <span className="mb-[5px] h-3 shrink-0" />
            <div className="grid flex-1" style={{ gridTemplateRows: 'repeat(7, minmax(0, 1fr))', rowGap: CELL_GAP }}>
              {ROW_LABELS.map((label, index) => (
                <span key={index} className="flex items-center">{label}</span>
              ))}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div
              aria-hidden="true"
              className="mb-[5px] grid h-3 text-[10px] leading-none text-gray-400"
              style={{ gridTemplateColumns: gridColumns, columnGap: CELL_GAP }}
            >
              {monthLabels.map(({ day, column }) => (
                <span key={day.date} className="whitespace-nowrap" style={{ gridColumnStart: column + 1 }}>
                  {MONTH_SHORT[Number(day.date.slice(5, 7)) - 1]}
                </span>
              ))}
            </div>
            <div
              className="grid"
              style={{
                gridTemplateColumns: gridColumns,
                gridTemplateRows: 'repeat(7, auto)',
                gridAutoFlow: 'column',
                gap: CELL_GAP,
              }}
            >
              {Array.from({ length: leadingBlanks }, (_, index) => (
                <span key={`blank-${index}`} aria-hidden="true" />
              ))}
              {/* Square cells, with a capped height so a very wide card never makes them tower */}
              {days.map((day, index) => renderCell(day, index, 'aspect-square max-h-7 w-full rounded-[3px]'))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <section aria-labelledby="activity-calendar-title" className="min-w-0 rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="activity-calendar-title" className="text-sm font-medium text-gray-200">
          Actividad diaria
        </h2>
        <div className="flex items-center gap-4">
          {layout === 'weeks' && view === 'calendar' && (
            <div className="flex items-center gap-1 text-xs text-gray-400" aria-hidden="true">
              <span>Menos</span>
              {LEVEL_COLORS.map((color) => (
                <span
                  key={color}
                  className="inline-block rounded-[3px]"
                  style={{ width: LEGEND_SWATCH, height: LEGEND_SWATCH, backgroundColor: color }}
                />
              ))}
              <span>Más</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setView(view === 'calendar' ? 'table' : 'calendar')}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs text-gray-400 transition-colors duration-150 hover:bg-[#1a1a1a] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          >
            {view === 'calendar' ? <IconTable size={14} aria-hidden="true" /> : <IconCalendar size={14} aria-hidden="true" />}
            {view === 'calendar' ? 'Ver como tabla' : 'Ver calendario'}
          </button>
        </div>
      </div>

      {view === 'table' ? (
        <table className="w-full text-sm [font-variant-numeric:tabular-nums]">
          <caption className="sr-only">Días con commits</caption>
          <thead>
            <tr className="border-b border-[#1f1f1f] text-left text-xs text-gray-400">
              <th scope="col" className="py-2 font-medium">Día</th>
              <th scope="col" className="py-2 text-right font-medium">Commits</th>
            </tr>
          </thead>
          <tbody>
            {activeDays.length === 0 ? (
              <tr>
                <td colSpan={2} className="py-3 text-gray-400">Sin días con commits en este periodo</td>
              </tr>
            ) : (
              [...activeDays].reverse().map((day) => (
                <tr key={day.date} className="border-b border-[#161616] last:border-0">
                  <td className="py-2 text-gray-200">{formatDayLong(day.date)}</td>
                  <td className="py-2 text-right text-white">{day.count}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      ) : layout === 'strip' ? (
        renderStrip()
      ) : layout === 'bars' ? (
        renderBars()
      ) : (
        renderWeeks()
      )}

      <p role="status" className="mt-3 min-h-5 text-xs text-gray-400">
        {shownDay ? (
          <>
            <span className="font-semibold text-white">{plural(shownDay.count, 'commit', 'commits')}</span>
            {' · '}
            {formatDayLong(shownDay.date)}
          </>
        ) : view === 'calendar' ? (
          'Pasa el ratón o usa el teclado sobre un día para ver sus commits'
        ) : null}
      </p>
    </section>
  )
}
