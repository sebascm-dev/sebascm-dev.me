'use client'

import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SPRING, popover, stagger, staggerItem } from './motion'
import {
  IconBrandAppstore,
  IconBrandDribbble,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandPinterest,
  IconBrandX,
  IconBrandYoutube,
  IconChevronDown,
} from '@tabler/icons-react'
import { SIZE_GROUPS, clampNumber, findSize, type SizePreset } from '@/lib/mockup'
import { useAnchoredPanel, useOutsideClick } from './ui'

const GROUP_ICONS: Record<string, typeof IconBrandX> = {
  instagram: IconBrandInstagram,
  twitter: IconBrandX,
  youtube: IconBrandYoutube,
  pinterest: IconBrandPinterest,
  dribbble: IconBrandDribbble,
  appstore: IconBrandAppstore,
  linkedin: IconBrandLinkedin,
}

const MIN_SIDE = 100
const MAX_SIDE = 8000

/** A rectangle drawn at the preset's proportions, inside a fixed box. */
function RatioShape({ size, box, children }: { size: SizePreset; box: number; children?: React.ReactNode }) {
  const scale = box / Math.max(size.width, size.height)
  return (
    <span
      className="rounded-md bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center"
      style={{ width: size.width * scale, height: size.height * scale }}
    >
      {children}
    </span>
  )
}

export function SizePicker({
  sizeId,
  width,
  height,
  onChange,
}: {
  sizeId: string
  width: number
  height: number
  onChange: (next: { sizeId: string; width: number; height: number }) => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  useOutsideClick(containerRef, open, () => setOpen(false))
  const panelStyle = useAnchoredPanel(containerRef, open)

  const preset = findSize(sizeId)
  const title = preset ? (preset.hint ? `${preset.label} ${preset.hint}` : `Default ${preset.label}`) : 'Personalizado'

  const setSide = (side: 'width' | 'height', raw: string) => {
    const value = clampNumber(Math.round(Number(raw)), MIN_SIDE, MAX_SIDE)
    onChange({ sizeId: 'custom', width: side === 'width' ? value : width, height: side === 'height' ? value : height })
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-2 rounded-xl bg-[#111] border border-[#1a1a1a] hover:border-[#2a2a2a] transition-colors cursor-pointer"
      >
        <span className="w-10 h-10 shrink-0 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] flex items-center justify-center">
          <RatioShape size={{ id: 'current', label: '', width, height }} box={26} />
        </span>
        <span className="flex-1 min-w-0 text-left">
          <span className="block text-sm text-white font-medium truncate">{title}</span>
          <span className="block text-[10px] text-gray-500 font-[var(--font-fira-code)]">
            {width} × {height}
          </span>
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={SPRING} className={open ? 'text-gray-400' : 'text-gray-500'}>
          <IconChevronDown size={15} />
        </motion.span>
      </button>

      <AnimatePresence>
      {open && (
        <motion.div
          variants={popover}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{ ...panelStyle, transformOrigin: 'top left' }}
          className="z-50 w-[320px] overflow-y-auto scrollbar-neon rounded-2xl bg-[#0d0d0d] border border-[#1f1f1f] shadow-2xl shadow-black/60 p-3 space-y-4"
        >
          <div className="grid grid-cols-2 gap-2">
            {(['width', 'height'] as const).map((side) => (
              <label key={side} className="flex items-center gap-2 h-10 px-3 rounded-lg bg-[#111] border border-[#1a1a1a] focus-within:border-[#22d3ee]">
                <span className="text-[11px] text-gray-500 font-semibold">{side === 'width' ? 'W' : 'H'}</span>
                <input
                  // Keyed by the value so a preset click resets what is typed.
                  key={`${side}-${side === 'width' ? width : height}`}
                  type="number"
                  min={MIN_SIDE}
                  max={MAX_SIDE}
                  defaultValue={side === 'width' ? width : height}
                  onBlur={(e) => setSide(side, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setSide(side, e.currentTarget.value)
                  }}
                  className="w-full bg-transparent text-right text-sm text-white font-[var(--font-fira-code)] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
              </label>
            ))}
          </div>

          {SIZE_GROUPS.map((group) => {
            const Icon = GROUP_ICONS[group.id]
            return (
              <div key={group.id} className="border-t border-[#1a1a1a] pt-3">
                {Icon && (
                  <p className="flex items-center gap-2 text-sm text-white font-semibold mb-3">
                    <Icon size={16} className="text-gray-400" />
                    {group.label}
                  </p>
                )}
                <motion.div className="grid grid-cols-3 gap-x-2 gap-y-3" variants={stagger} initial="hidden" animate="visible">
                  {group.sizes.map((size) => (
                    <motion.button
                      key={size.id}
                      variants={staggerItem}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.94 }}
                      type="button"
                      onClick={() => {
                        onChange({ sizeId: size.id, width: size.width, height: size.height })
                        setOpen(false)
                      }}
                      className="flex flex-col items-center gap-1.5 cursor-pointer group"
                    >
                      <span
                        className={
                          size.id === sizeId
                            ? 'h-[76px] w-full flex items-center justify-center rounded-lg ring-2 ring-[#22d3ee]'
                            : 'h-[76px] w-full flex items-center justify-center rounded-lg group-hover:bg-[#141414] transition-colors'
                        }
                      >
                        <RatioShape size={size} box={62}>
                          {Icon && <Icon size={14} className="text-gray-500" />}
                        </RatioShape>
                      </span>
                      <span className="text-[10px] text-gray-300 leading-tight text-center">
                        {size.label}
                        {size.hint && <span className="block text-gray-500">{size.hint}</span>}
                      </span>
                    </motion.button>
                  ))}
                </motion.div>
              </div>
            )
          })}
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  )
}
