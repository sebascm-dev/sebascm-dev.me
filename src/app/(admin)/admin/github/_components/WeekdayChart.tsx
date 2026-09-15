import { formatNumber, plural } from '@/lib/github/format'
import type { WeekdayCount } from '@/lib/github/types'

const CHART_HEIGHT = 96

interface WeekdayChartProps {
  weekdays: WeekdayCount[]
}

/** Monday → Sunday columns; only the busiest day is labeled, every value is in the hidden list */
export function WeekdayChart({ weekdays }: WeekdayChartProps) {
  const max = weekdays.reduce((highest, day) => Math.max(highest, day.count), 0)
  const peak = max > 0 ? weekdays.find((day) => day.count === max) : undefined

  return (
    <section aria-labelledby="weekday-chart-title" className="rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] p-5">
      <h2 id="weekday-chart-title" className="mb-3 text-xs text-gray-400">
        Por día de la semana
      </h2>

      <div aria-hidden="true" className="flex items-end justify-between gap-2" style={{ height: CHART_HEIGHT + 18 }}>
        {weekdays.map((day) => {
          const height = day.count === 0 ? 0 : Math.max(3, Math.round((day.count / max) * CHART_HEIGHT))
          return (
            <div key={day.weekday} className="flex flex-1 flex-col items-center justify-end gap-1">
              <span className={`text-[11px] text-white ${day === peak ? '' : 'invisible'}`}>{formatNumber(day.count)}</span>
              <span className="w-full max-w-[14px] rounded-t-[4px] bg-[#22d3ee]" style={{ height }} />
            </div>
          )
        })}
      </div>

      <div aria-hidden="true" className="mt-1.5 flex justify-between gap-2 border-t border-[#1f1f1f] pt-1.5 text-[11px] text-gray-400">
        {weekdays.map((day) => (
          <span key={day.weekday} className="flex-1 text-center">
            {day.label}
          </span>
        ))}
      </div>

      <ul className="sr-only">
        {weekdays.map((day) => (
          <li key={day.weekday}>
            {day.name}: {plural(day.count, 'commit', 'commits')}
          </li>
        ))}
      </ul>
    </section>
  )
}
