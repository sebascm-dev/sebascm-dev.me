'use client'

import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SPRING, popover, stagger, staggerItem } from './motion'
import {
  IconChevronDown,
  IconDeviceDesktop,
  IconDeviceIpad,
  IconDeviceLaptop,
  IconDeviceMobile,
  IconDeviceWatch,
} from '@tabler/icons-react'
import {
  DEVICE_CATEGORIES,
  DEVICES,
  findDevice,
  formatScreen,
  mockupAspect,
  type DeviceCategoryId,
  type DevicePreset,
} from '@/lib/mockup'
import { DeviceFrame } from './DeviceFrame'
import { useAnchoredPanel, useOutsideClick } from './ui'

type Tab = 'all' | Exclude<DeviceCategoryId, 'essentials'>

const TAB_ICONS = {
  phone: IconDeviceMobile,
  tablet: IconDeviceIpad,
  laptop: IconDeviceLaptop,
  desktop: IconDeviceDesktop,
  watch: IconDeviceWatch,
} as const

/** A device drawn at thumbnail size, fitted inside a box of the given height. */
function DeviceThumb({ device, variantId, height }: { device: DevicePreset; variantId?: string; height: number }) {
  const variant = device.variants.find((v) => v.id === variantId) ?? device.variants[0]
  const aspect = mockupAspect(device, 16 / 10)
  return (
    <div style={{ width: Math.min(height * aspect, height * 1.8) }}>
      <DeviceFrame device={device} variant={variant} image={null} radius={3} shadow="none" light="none" placeholder="" />
    </div>
  )
}

function DeviceCard({
  device,
  selected,
  selectedVariantId,
  onSelect,
}: {
  device: DevicePreset
  selected: boolean
  selectedVariantId: string
  onSelect: (deviceId: string, variantId: string) => void
}) {
  const shown = device.variants.slice(0, 3)
  const hidden = device.variants.length - shown.length

  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -3 }}
      transition={SPRING}
      className={
        selected
          ? 'rounded-xl bg-[#141414] border border-[#22d3ee]/60 p-3 flex flex-col gap-2'
          : 'rounded-xl bg-[#111] border border-[#1a1a1a] hover:border-[#2a2a2a] transition-colors p-3 flex flex-col gap-2'
      }
    >
      <button type="button" onClick={() => onSelect(device.id, device.variants[0].id)} className="text-left cursor-pointer">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm text-white font-medium truncate">{device.label}</p>
            <p className="text-[10px] text-gray-500 font-[var(--font-fira-code)]">
              {device.screen ? `${device.screen.width} / ${device.screen.height}` : 'Se adapta a la imagen'}
            </p>
          </div>
          {device.isNew && (
            <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-[#22d3ee] text-black font-semibold">Nuevo</span>
          )}
        </div>
        <div className="h-28 flex items-center justify-center mt-2">
          <DeviceThumb device={device} variantId={selected ? selectedVariantId : undefined} height={104} />
        </div>
      </button>

      <div className="flex gap-1.5">
        {shown.map((variant) => (
          <button
            key={variant.id}
            type="button"
            title={variant.label}
            onClick={() => onSelect(device.id, variant.id)}
            className={
              selected && selectedVariantId === variant.id
                ? 'flex-1 h-7 rounded-md ring-2 ring-[#22d3ee] cursor-pointer'
                : 'flex-1 h-7 rounded-md border border-[#2a2a2a] hover:border-gray-500 transition-colors cursor-pointer'
            }
            style={{ background: variant.color }}
          />
        ))}
        {hidden > 0 && (
          <button
            type="button"
            onClick={() => onSelect(device.id, device.variants[3].id)}
            className="flex-1 h-7 rounded-md border border-[#2a2a2a] text-[10px] text-gray-400 hover:text-white cursor-pointer"
          >
            +{hidden}
          </button>
        )}
      </div>
    </motion.div>
  )
}

export function DevicePicker({
  deviceId,
  variantId,
  onChange,
}: {
  deviceId: string
  variantId: string
  onChange: (deviceId: string, variantId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('all')
  const containerRef = useRef<HTMLDivElement>(null)
  useOutsideClick(containerRef, open, () => setOpen(false))
  const panelStyle = useAnchoredPanel(containerRef, open)

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const current = findDevice(deviceId)
  // Headings follow shots.so: one per category, except phones, which are
  // split by series (iPhone 17, older iPhones, Android).
  const categories = tab === 'all' ? DEVICE_CATEGORIES : DEVICE_CATEGORIES.filter((c) => c.id === tab)
  const groups = categories.flatMap((category) => {
    const devices = DEVICES.filter((d) => d.category === category.id)
    const series = [...new Set(devices.map((d) => d.series ?? category.label))]
    return series.map((label) => ({ id: `${category.id}-${label}`, label, devices: devices.filter((d) => (d.series ?? category.label) === label) }))
  })

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-2 rounded-xl bg-[#111] border border-[#1a1a1a] hover:border-[#2a2a2a] transition-colors cursor-pointer"
      >
        <span className="w-10 h-10 shrink-0 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] flex items-center justify-center overflow-hidden">
          <DeviceThumb device={current} variantId={variantId} height={30} />
        </span>
        <span className="flex-1 min-w-0 text-left">
          <span className="block text-sm text-white font-medium truncate">{current.label}</span>
          <span className="block text-[10px] text-gray-500 truncate">{formatScreen(current)}</span>
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
          className="z-50 w-[440px] overflow-y-auto scrollbar-neon rounded-2xl bg-[#0d0d0d] border border-[#1f1f1f] shadow-2xl shadow-black/60 p-3"
        >
          <div className="flex gap-1.5 mb-3 sticky top-0 bg-[#0d0d0d] pb-2 z-10">
            {(['all', ...Object.keys(TAB_ICONS)] as Tab[]).map((id) => {
              const Icon = id === 'all' ? null : TAB_ICONS[id]
              const active = tab === id
              const label = id === 'all' ? 'Todos' : DEVICE_CATEGORIES.find((c) => c.id === id)!.label
              return (
                <motion.button
                  key={id}
                  type="button"
                  title={label}
                  onClick={() => setTab(id)}
                  layout
                  transition={SPRING}
                  className={
                    active
                      ? 'relative flex-1 h-9 px-3 rounded-full text-black text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer'
                      : 'relative flex-1 h-9 px-3 rounded-full bg-[#161616] text-gray-400 hover:text-white text-xs inline-flex items-center justify-center cursor-pointer'
                  }
                >
                  {/* The white pill slides to the selected tab; `layout` lets the
                      tab widen smoothly as its label appears */}
                  {active && <motion.span layoutId="device-tab-pill" transition={SPRING} className="absolute inset-0 rounded-full bg-white" />}
                  <span className="relative inline-flex items-center gap-1.5">
                    {Icon && <Icon size={16} />}
                    {(active || !Icon) && label}
                  </span>
                </motion.button>
              )
            })}
          </div>

          {groups.map((group) => {
            // "All" shows one row per heading until "See all" is pressed.
            const collapsible = tab === 'all' && group.devices.length > 2
            const open = !collapsible || expanded[group.id]
            return (
            <div key={group.id} className="mb-4 last:mb-0">
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-sm text-white font-semibold">{group.label}</p>
                {collapsible && (
                  <button
                    type="button"
                    onClick={() => setExpanded((e) => ({ ...e, [group.id]: !open }))}
                    className="px-2.5 py-1 rounded-full bg-[#1a1a1a] text-[10px] text-gray-300 hover:text-white font-semibold cursor-pointer"
                  >
                    {open ? 'See less' : 'See all'}
                  </button>
                )}
              </div>
              {/* Keyed by tab and expansion so the cards cascade in on each change */}
              <motion.div
                key={`${tab}-${open}`}
                className="grid grid-cols-2 gap-2"
                variants={stagger}
                initial="hidden"
                animate="visible"
              >
                {(open ? group.devices : group.devices.slice(0, 2)).map((device) => (
                  <DeviceCard
                    key={device.id}
                    device={device}
                    selected={device.id === deviceId}
                    selectedVariantId={variantId}
                    onSelect={(d, v) => {
                      onChange(d, v)
                      setOpen(false)
                    }}
                  />
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
