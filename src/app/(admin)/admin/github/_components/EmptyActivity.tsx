'use client'

import { formatDayMonth, RANGE_LABELS, RANGE_SHORT_LABELS } from '@/lib/github/format'
import type { RangeKey } from '@/lib/github/types'
import { useRangeTransition } from './RangeTransition'

const WIDER_RANGE: Record<RangeKey, RangeKey | null> = {
  '7d': '30d',
  '30d': '90d',
  '90d': '12m',
  '12m': null,
}

interface EmptyActivityProps {
  range: RangeKey
  /** Madrid day (YYYY-MM-DD) of the latest commit in the previous window, if any */
  lastCommitDate: string | null
}

export function EmptyActivity({ range, lastCommitDate }: EmptyActivityProps) {
  const { changeRange } = useRangeTransition()
  const wider = WIDER_RANGE[range]

  return (
    <div className="flex flex-col items-start gap-1 py-6">
      <p className="text-sm font-medium text-white">Sin commits en los {RANGE_LABELS[range]}</p>
      {lastCommitDate && (
        <p className="text-sm text-gray-400">Tu último commit fue el {formatDayMonth(lastCommitDate)}.</p>
      )}
      {wider && (
        <button
          type="button"
          onClick={() => changeRange(wider)}
          className="mt-2 cursor-pointer rounded-lg border border-[#262626] px-3 py-1.5 text-sm text-gray-200 transition-colors duration-150 hover:border-[#22d3ee]/50 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
        >
          Ver {RANGE_SHORT_LABELS[wider]}
        </button>
      )}
    </div>
  )
}
