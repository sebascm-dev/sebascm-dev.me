'use client'

import { useRef, useState, type KeyboardEvent } from 'react'
import { RANGE_KEYS } from '@/lib/github/range'
import { RANGE_SHORT_LABELS } from '@/lib/github/format'
import type { RangeKey } from '@/lib/github/types'
import { useRangeTransition } from './RangeTransition'

interface RangeFilterProps {
  value: RangeKey
}

/** Accessible segmented control (radio group with roving focus) */
export function RangeFilter({ value }: RangeFilterProps) {
  const { changeRange } = useRangeTransition()
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  // Optimistic selection: marks the choice instantly and compares against the
  // last requested range, not the URL, which only updates when the render lands.
  const [selected, setSelected] = useState(value)
  const [previousValue, setPreviousValue] = useState(value)
  if (value !== previousValue) {
    setPreviousValue(value)
    setSelected(value)
  }

  function select(range: RangeKey) {
    if (range === selected) return
    setSelected(range)
    changeRange(range)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = RANGE_KEYS.length - 1
    const next =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? index === last ? 0 : index + 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? index === 0 ? last : index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null
    if (next === null) return

    event.preventDefault()
    buttons.current[next]?.focus()
    select(RANGE_KEYS[next])
  }

  return (
    <div
      role="radiogroup"
      aria-label="Periodo"
      className="inline-flex rounded-lg border border-[#262626] bg-[#0d0d0d] p-0.5"
    >
      {RANGE_KEYS.map((range, index) => {
        const checked = range === selected
        return (
          <button
            key={range}
            ref={(element) => {
              buttons.current[index] = element
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => select(range)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${
              checked ? 'bg-[#22d3ee] font-semibold text-[#0a0a0a]' : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
            }`}
          >
            {RANGE_SHORT_LABELS[range]}
          </button>
        )
      })}
    </div>
  )
}
