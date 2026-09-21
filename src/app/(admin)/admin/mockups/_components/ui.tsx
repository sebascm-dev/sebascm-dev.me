'use client'

// Small building blocks shared by every editor panel, styled after the admin:
// #0d0d0d panels, #1a1a1a borders and the cyan accent.

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { motion } from 'framer-motion'
import { clampNumber } from '@/lib/mockup'
import { SPRING, press } from './motion'

export function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest font-[var(--font-fira-code)]">
        {children}
      </p>
      {action}
    </div>
  )
}

export function Section({ label, action, children }: { label: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="px-3 py-3 border-t border-[#1a1a1a] first:border-t-0">
      <SectionLabel action={action}>{label}</SectionLabel>
      {children}
    </section>
  )
}

/**
 * A filled bar with the label inside, like the sliders in shots.so. The native
 * range input sits invisibly on top, so keyboard and pointer input still work.
 */
export function BarSlider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  onChange: (value: number) => void
}) {
  const percent = ((value - min) / (max - min)) * 100

  return (
    <div className="relative h-8 rounded-lg bg-[#111] border border-[#1a1a1a] overflow-hidden">
      <div className="absolute inset-y-0 left-0 bg-[#22d3ee]/15" style={{ width: `${percent}%` }} />
      <div
        className="absolute top-1.5 bottom-1.5 w-[3px] rounded-full bg-[#22d3ee]"
        style={{ left: `calc(${percent}% - ${percent > 2 ? 3 : 0}px)` }}
      />
      <div className="relative h-full flex items-center justify-between px-3 pointer-events-none">
        <span className="text-[11px] text-gray-400">{label}</span>
        <span className="text-[11px] text-gray-300 font-[var(--font-fira-code)] tabular-nums">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(clampNumber(Number(e.target.value), min, max))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
      />
    </div>
  )
}

/** A preview tile with a caption underneath — the unit of every option grid. */
export function Tile({
  label,
  active,
  onClick,
  disabled,
  title,
  children,
}: {
  label?: string
  active?: boolean
  onClick?: () => void
  disabled?: boolean
  title?: string
  children: ReactNode
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      {...(disabled ? {} : press)}
      className="group flex flex-col items-center gap-1 min-w-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span
        className={
          active
            ? 'w-full aspect-square rounded-lg overflow-hidden ring-2 ring-[#22d3ee] ring-offset-2 ring-offset-[#0d0d0d] flex items-center justify-center bg-[#111]'
            : 'w-full aspect-square rounded-lg overflow-hidden border border-[#1a1a1a] group-hover:border-[#2a2a2a] transition-colors flex items-center justify-center bg-[#111]'
        }
      >
        {children}
      </span>
      {label && (
        <span className={active ? 'text-[10px] text-white truncate max-w-full' : 'text-[10px] text-gray-500 truncate max-w-full'}>
          {label}
        </span>
      )}
    </motion.button>
  )
}

/** On/off switch in the admin's style. */
export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={
        checked
          ? 'relative w-9 h-5 p-0.5 flex justify-end rounded-full bg-[#22d3ee] border border-[#22d3ee] transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'
          : 'relative w-9 h-5 p-0.5 flex justify-start rounded-full bg-[#1f1f1f] border border-[#2a2a2a] transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'
      }
    >
      {/* `layout` springs the knob between the two flex ends */}
      <motion.span
        layout
        transition={SPRING}
        className={checked ? 'w-3.5 h-3.5 rounded-full bg-white shadow' : 'w-3.5 h-3.5 rounded-full bg-white/40'}
      />
    </button>
  )
}

/** Segmented control: a pill track with one highlighted option. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
}: {
  options: { id: T; label: ReactNode; title?: string }[]
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
}) {
  const pad = size === 'sm' ? 'py-1 text-[11px]' : 'py-1.5 text-xs'
  // One layoutId per control, so the pill slides within this control only and
  // never flies across to another Segmented on the page.
  const pillId = useId()
  return (
    <div className="flex p-1 gap-1 rounded-xl bg-[#111] border border-[#1a1a1a]">
      {options.map((option) => {
        const active = option.id === value
        return (
          <button
            key={option.id}
            type="button"
            title={option.title}
            onClick={() => onChange(option.id)}
            className={
              active
                ? `relative flex-1 inline-flex items-center justify-center gap-1.5 px-2 ${pad} rounded-lg text-white font-medium cursor-pointer`
                : `relative flex-1 inline-flex items-center justify-center gap-1.5 px-2 ${pad} rounded-lg text-gray-500 hover:text-white transition-colors cursor-pointer`
            }
          >
            {active && <motion.span layoutId={pillId} transition={SPRING} className="absolute inset-0 rounded-lg bg-[#1f1f1f]" />}
            <span className="relative inline-flex items-center gap-1.5">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Fixed-position style that pins a dropdown under its trigger. The panels live
 * inside scrolling columns, and `overflow: auto` clips absolutely positioned
 * children on both axes — fixed positioning escapes that clipping.
 */
export function useAnchoredPanel(
  triggerRef: RefObject<HTMLElement | null>,
  open: boolean,
  /** Below the trigger (dropdowns) or beside it (the effect flyouts). */
  placement: 'below' | 'right' = 'below',
): CSSProperties {
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      setPosition(
        placement === 'right'
          ? // Kept on screen: a flyout opened low in the column slides up to fit.
            { top: Math.max(16, Math.min(rect.top, window.innerHeight - 480)), left: rect.right + 12 }
          : { top: rect.bottom + 8, left: rect.left },
      )
    }
    place()
    // Capture phase, so scrolling the column the trigger sits in also counts.
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [triggerRef, open, placement])

  return {
    position: 'fixed',
    top: position.top,
    left: position.left,
    maxHeight: `calc(100vh - ${position.top + 16}px)`,
  }
}

/** Calls `onOutside` on a pointer press outside `ref` while `active`. */
export function useOutsideClick(ref: RefObject<HTMLElement | null>, active: boolean, onOutside: () => void) {
  const handler = useRef(onOutside)
  useEffect(() => {
    handler.current = onOutside
  })

  useEffect(() => {
    if (!active) return
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) handler.current()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handler.current()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [ref, active])
}
