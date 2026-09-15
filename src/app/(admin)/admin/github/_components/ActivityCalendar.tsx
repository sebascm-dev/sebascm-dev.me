'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { IconCalendar, IconTable } from '@tabler/icons-react'
import { activityLevel, weekdayIndex } from '@/lib/github/activity'
import { formatDayLong, plural } from '@/lib/github/format'
import { addDays } from '@/lib/github/range'
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

const ROW_LABELS = ['L', '', 'X', '', 'V', '', 'D']
const WEEKDAY_SHORT = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']
const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic']

/**
 * - strip: 7 days side by side (7d)
 * - month: a wall calendar, weekdays as columns and weeks as rows (30d)
 * - weeks: GitHub-style heatmap, weeks as columns and weekdays as rows (90d, 12m)
 */
type Layout = 'strip' | 'month' | 'weeks'

const LAYOUTS: Record<RangeKey, Layout> = { '7d': 'strip', '30d': 'month', '90d': 'weeks', '12m': 'weeks' }

// Arrow keys follow what is visually adjacent in each layout
const MOVES: Record<Layout, Record<string, number>> = {
  strip: { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 1, ArrowUp: -1 },
  month: { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7 },
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

  function renderCell(day: DayCount, index: number, className: string) {
    return (
      <button
        key={day.date}
        ref={(element) => {
          cells.current[index] = element
        }}
        type="button"
        aria-label={labelFor(day)}
        tabIndex={index === activeIndex ? 0 : -1}
        onFocus={() => {
          setActiveIndex(index)
          setHighlighted(index)
        }}
        onMouseEnter={() => setHighlighted(index)}
        onKeyDown={(event) => handleKeyDown(event, index)}
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

  function renderMonth() {
    return (
      <div className="grid gap-1" style={{ gridTemplateColumns: 'auto repeat(7, minmax(0, 1fr))' }}>
        <span aria-hidden="true" />
        {WEEKDAY_SHORT.map((weekday) => (
          <span key={weekday} aria-hidden="true" className="pb-1 text-center text-xs text-gray-400">
            {weekday}
          </span>
        ))}
        {Array.from({ length: weekCount }, (_, week) => {
          const firstSlot = week * 7 - leadingBlanks
          return [
            <span
              key={`week-${week}`}
              aria-hidden="true"
              className="flex items-center justify-end whitespace-nowrap pr-2 text-xs text-gray-400"
            >
              {/* The Monday that starts the row, even when it falls before the range */}
              {days.length > 0 && shortDate(addDays(days[0].date, firstSlot))}
            </span>,
            ...Array.from({ length: 7 }, (_, weekday) => {
              const index = firstSlot + weekday
              const day = days[index]
              return day ? (
                renderCell(day, index, 'h-8 w-full rounded-md')
              ) : (
                <span key={`blank-${week}-${weekday}`} aria-hidden="true" />
              )
            }),
          ]
        })}
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
              {/* Square while narrow (12m); capped height so few weeks (90d) widen instead of towering */}
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
          {layout !== 'strip' && view === 'calendar' && (
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
      ) : layout === 'month' ? (
        renderMonth()
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
