import { IconArrowDownRight, IconArrowUpRight } from '@tabler/icons-react'
import { formatChange, formatNumber, PREVIOUS_RANGE_LABELS, RANGE_LABELS } from '@/lib/github/format'
import type { RangeKey } from '@/lib/github/types'
import { Sparkline } from './Sparkline'

interface ActivityHeroProps {
  total: number
  previousTotal: number
  delta: number | null
  sparkline: number[]
  range: RangeKey
}

/** Direction is carried by an arrow and a sign, never by color alone */
function DeltaLine({ total, previousTotal, delta, range }: Omit<ActivityHeroProps, 'sparkline'>) {
  const previous = PREVIOUS_RANGE_LABELS[range]

  if (delta === null) {
    return <p className="mt-2 text-sm text-gray-400">Sin commits en los {previous}</p>
  }
  if (delta === 0) {
    return <p className="mt-2 text-sm text-gray-400">Igual que los {previous}</p>
  }

  const isUp = delta > 0
  const Icon = isUp ? IconArrowUpRight : IconArrowDownRight
  const tone = isUp ? 'text-emerald-400' : 'text-red-400'

  return (
    <p className="mt-2 flex flex-wrap items-center gap-1 text-sm">
      <Icon size={16} aria-hidden="true" className={tone} />
      <span className={`font-medium ${tone}`}>{formatChange(total, previousTotal)}</span>
      <span className="text-gray-400">vs {previous}</span>
    </p>
  )
}

export function ActivityHero({ total, previousTotal, delta, sparkline, range }: ActivityHeroProps) {
  return (
    <section
      aria-labelledby="activity-hero-title"
      className="col-span-2 flex min-w-0 flex-col justify-between gap-4 rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] p-5 sm:col-span-3 lg:col-span-1"
    >
      <h2 id="activity-hero-title" className="text-xs text-gray-400">
        Commits · {RANGE_LABELS[range]}
      </h2>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-5xl font-semibold leading-none text-white">{formatNumber(total)}</p>
          <DeltaLine total={total} previousTotal={previousTotal} delta={delta} range={range} />
        </div>
        <Sparkline values={sparkline} />
      </div>
    </section>
  )
}
