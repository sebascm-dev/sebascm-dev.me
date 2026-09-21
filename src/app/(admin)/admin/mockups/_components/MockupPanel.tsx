'use client'

/* eslint-disable @next/next/no-img-element */
// The media preview is an in-memory data URL; next/image adds nothing here.

import { useRef, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { EASE, SPRING } from './motion'
import {
  IconAdjustments,
  IconChevronLeft,
  IconChevronRight,
  IconEye,
  IconEyeOff,
  IconPlus,
  IconSparkles,
  IconTrash,
} from '@tabler/icons-react'
import {
  BORDERS,
  SHADOW_MODES,
  STYLES,
  findDevice,
  formatScreen,
  type BackgroundPreset,
  type Look,
  type MockupState,
  type ShadowMode,
  type StyleId,
} from '@/lib/mockup'
import { DevicePicker } from './DevicePicker'
import type { SlotMedia } from './MockupCanvas'
import { BarSlider, Section, Tile } from './ui'

type Props = {
  state: MockupState
  update: (patch: Partial<MockupState>) => void
  /** Screenshots of the visible devices, in slot order. */
  slots: SlotMedia[]
  /** Slot that receives the next picked, pasted or dropped screenshot. */
  activeSlot: number
  onSelectSlot: (slot: number) => void
  onPickImage: (file: File) => void
  onClearImage: (slot: number) => void
  /** Magic Presets generated from the screenshot; empty until there is one. */
  looks: Look[]
  /** Palette backgrounds the looks point at, to preview the active one. */
  magic: BackgroundPreset[]
  /** Look currently applied, or null when none has been picked yet. */
  lookIndex: number | null
  onCycleLook: (direction: 1 | -1) => void
  /** First screenshot, shown in the Magic Preset card like in shots.so. */
  previewImage: string | null
}

/** The card the tiles show: a white screen peeking out from the bottom-right. */
const CARD: CSSProperties = { position: 'absolute', left: '26%', top: '26%', width: '100%', height: '100%', borderRadius: 8 }

function StylePreview({ styleId }: { styleId: StyleId }) {
  const shells: Record<StyleId, CSSProperties> = {
    default: { background: '#ffffff' },
    'glass-light': { background: '#ffffff', boxShadow: '0 0 0 5px rgba(255, 255, 255, 0.55)' },
    'glass-dark': { background: '#ffffff', boxShadow: '0 0 0 5px rgba(90, 90, 90, 0.8)' },
    liquid: { background: '#ffffff', boxShadow: '0 0 0 6px #fb923c, 0 0 0 9px #fde047' },
    'inset-light': { background: '#ffffff', boxShadow: '0 0 0 5px #f1f1f1, inset 0 1px 4px rgba(0, 0, 0, 0.3)' },
    'inset-dark': { background: '#ffffff', boxShadow: '0 0 0 5px #3a3a3a, inset 0 1px 4px rgba(0, 0, 0, 0.4)' },
    outline: { background: '#ffffff', boxShadow: '0 0 0 3px #d4d4d4' },
    border: { background: '#1c1c1c', boxShadow: '0 0 0 5px #ffffff' },
    retro: { background: '#ffffff', border: '3px solid #0a0a0a', boxShadow: '5px 5px 0 #0a0a0a' },
    card: { background: '#ffffff', boxShadow: '0 0 0 6px #ffffff, 0 0 0 7px #d4d4d4' },
    stack: { background: '#ffffff', boxShadow: '0 6px 0 -3px #f1f1f1, 0 12px 0 -6px #e2e2e2' },
    'stack-2': { background: '#ffffff', boxShadow: '6px -6px 0 -2px #f1f1f1, 12px -12px 0 -4px #e2e2e2' },
  }
  return (
    <span className="relative w-full h-full bg-gradient-to-br from-[#e8e8e8] to-[#bdbdbd]">
      <span style={{ ...CARD, ...shells[styleId] }} />
    </span>
  )
}

function ShadowPreview({ mode }: { mode: ShadowMode }) {
  const shadows: Record<ShadowMode, string> = {
    none: 'none',
    spread: '0 10px 18px -4px rgba(0, 0, 0, 0.45)',
    hug: '0 3px 5px rgba(0, 0, 0, 0.5)',
    adaptive: '0 8px 20px 2px rgba(249, 115, 22, 0.8)',
  }
  return (
    <span className="relative w-full h-full bg-[#f4f4f4]">
      <span style={{ ...CARD, background: mode === 'adaptive' ? 'linear-gradient(135deg, #fb923c, #ef4444)' : '#ffffff', boxShadow: shadows[mode] }} />
    </span>
  )
}

function CornerPreview({ radius }: { radius: number }) {
  return (
    <span
      className="block w-5 h-5 border-t-2 border-r-2 border-gray-300 translate-x-[-2px] translate-y-[2px]"
      style={{ borderTopRightRadius: radius }}
    />
  )
}

export function MockupPanel({
  state,
  update,
  slots,
  activeSlot,
  onSelectSlot,
  onPickImage,
  onClearImage,
  looks,
  magic,
  lookIndex,
  onCycleLook,
  previewImage,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [lightOpen, setLightOpen] = useState(false)
  const device = findDevice(state.deviceId)
  const adaptive = device.kind === 'screenshot' || device.kind === 'browser'
  const ready = looks.length > 0
  const look = lookIndex !== null ? looks[lookIndex] : null
  const lookBackground = look ? magic.find((m) => m.id === look.patch.backgroundId)?.css : undefined
  const lookHint = !ready
    ? 'Subí una captura para activarlo'
    : look
      ? `${look.label} · ${lookIndex! + 1}/${looks.length}`
      : `${looks.length} estilos a juego con tu captura`

  return (
    <div>
      <div className="px-3 pt-3 space-y-2">
        <DevicePicker
          deviceId={state.deviceId}
          variantId={state.variantId}
          onChange={(deviceId, variantId) => update({ deviceId, variantId })}
        />

        {/* Magic Preset — looks generated from the screenshot's own colours */}
        <div
          className={
            ready
              ? 'rounded-xl bg-[#111] border border-[#1a1a1a] p-2.5'
              : 'rounded-xl bg-[#111] border border-[#1a1a1a] p-2.5 opacity-50'
          }
          title={ready ? undefined : 'Necesita una captura para leer sus colores'}
        >
          <div className="flex items-center gap-2.5">
            {/* The screenshot on the look's background, like shots.so's card */}
            <span
              className="relative w-8 h-10 shrink-0 rounded-md border border-[#1a1a1a] flex items-center justify-center text-[#22d3ee] overflow-hidden"
              style={{ background: lookBackground ?? '#0a0a0a' }}
            >
              {previewImage ? (
                <img src={previewImage} alt="" className="w-[76%] h-auto max-h-[80%] object-contain rounded-[2px] shadow" />
              ) : (
                <IconSparkles size={15} />
              )}
            </span>
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-1 text-xs text-white font-medium">
                {previewImage && <IconSparkles size={12} className="text-[#22d3ee]" />}
                Magic Preset
              </span>
              {/* Each new look's name slides in, like flipping through cards */}
              <span className="relative block h-4 overflow-hidden">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={lookHint}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={EASE}
                    className="absolute inset-0 text-[10px] text-gray-500 truncate"
                  >
                    {lookHint}
                  </motion.span>
                </AnimatePresence>
              </span>
            </span>
            <button
              type="button"
              aria-label="Preset anterior"
              disabled={!ready}
              onClick={() => onCycleLook(-1)}
              className="p-1 text-gray-500 hover:text-white cursor-pointer disabled:cursor-not-allowed disabled:hover:text-gray-500"
            >
              <IconChevronLeft size={15} />
            </button>
            <button
              type="button"
              aria-label="Preset siguiente"
              disabled={!ready}
              onClick={() => onCycleLook(1)}
              className="p-1 text-gray-500 hover:text-white cursor-pointer disabled:cursor-not-allowed disabled:hover:text-gray-500"
            >
              <IconChevronRight size={15} />
            </button>
          </div>
          <div className="mt-2 h-[3px] rounded-full bg-[#1f1f1f] overflow-hidden">
            <motion.div
              className="h-full bg-[#22d3ee]"
              animate={{ width: ready && lookIndex !== null ? `${((lookIndex + 1) / looks.length) * 100}%` : '0%' }}
              transition={SPRING}
            />
          </div>
        </div>
      </div>

      <Section label="Media">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onPickImage(file)
            e.target.value = ''
          }}
        />
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${slots.length}, minmax(0, 1fr))` }}>
          {slots.map((slot, index) => {
            // With one device there is nothing to choose between, so the
            // selection ring only appears in multi-device compositions.
            const selected = slots.length > 1 && index === activeSlot
            return (
              <div key={index} className="relative group">
                <button
                  type="button"
                  title={slots.length > 1 ? `Captura del dispositivo ${index + 1}` : 'Elegir captura'}
                  onClick={() => {
                    onSelectSlot(index)
                    fileInputRef.current?.click()
                  }}
                  className={
                    selected
                      ? 'relative w-full h-[72px] rounded-xl bg-[#111] border border-[#22d3ee] flex items-center justify-center overflow-hidden cursor-pointer'
                      : 'relative w-full h-[72px] rounded-xl bg-[#111] border border-[#1a1a1a] hover:border-[#22d3ee]/60 transition-colors flex items-center justify-center overflow-hidden cursor-pointer'
                  }
                >
                  {slot.image ? (
                    // A freshly loaded screenshot settles in with a small zoom
                    <motion.img
                      key={slot.image.length}
                      src={slot.image}
                      alt=""
                      initial={{ opacity: 0, scale: 1.12 }}
                      animate={{ opacity: 0.8, scale: 1 }}
                      transition={SPRING}
                      className="h-full w-full object-cover group-hover:opacity-60 transition-opacity"
                    />
                  ) : (
                    <span className="w-12 h-10 rounded-md bg-[#2a2a2a] flex items-center justify-center text-gray-300">
                      <IconPlus size={16} />
                    </span>
                  )}
                  {slots.length > 1 && (
                    <span className="absolute left-1.5 top-1.5 text-[9px] font-semibold text-white/80 bg-black/50 rounded px-1">{index + 1}</span>
                  )}
                </button>
                {slot.image && (
                  <button
                    type="button"
                    onClick={() => onClearImage(index)}
                    title="Quitar captura"
                    className="absolute right-1.5 top-1.5 p-1 rounded-md bg-black/60 text-gray-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <IconTrash size={12} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <p className="mt-1.5 text-[10px] text-gray-500">
          {slots.length > 1
            ? 'Soltá cada captura sobre su dispositivo, o elegí un hueco y pegá'
            : 'Arrastrá, pegá o hacé clic para elegir'}
        </p>
      </Section>

      {adaptive ? (
        <Section label="Style">
          <div className="grid grid-cols-3 gap-x-2 gap-y-2.5">
            {STYLES.map((style) => (
              <Tile key={style.id} label={style.label} active={state.styleId === style.id} onClick={() => update({ styleId: style.id })}>
                <StylePreview styleId={style.id} />
              </Tile>
            ))}
          </div>
          {device.variants.length > 1 && (
            <div className="grid grid-cols-2 gap-1.5 mt-3">
              {device.variants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => update({ variantId: variant.id })}
                  className={
                    state.variantId === variant.id
                      ? 'h-8 rounded-lg bg-[#1f1f1f] text-white text-[11px] font-medium cursor-pointer'
                      : 'h-8 rounded-lg bg-[#111] border border-[#1a1a1a] text-gray-500 hover:text-white text-[11px] cursor-pointer'
                  }
                >
                  {variant.label}
                </button>
              ))}
            </div>
          )}
        </Section>
      ) : (
        <Section label="Color">
          <div className="grid grid-cols-4 gap-x-2 gap-y-2.5">
            {device.variants.map((variant) => (
              <Tile key={variant.id} label={variant.label} active={state.variantId === variant.id} onClick={() => update({ variantId: variant.id })}>
                <span className="w-full h-full" style={{ background: `linear-gradient(145deg, #ffffff55, ${variant.color} 45%, #00000044)` }} />
              </Tile>
            ))}
          </div>
        </Section>
      )}

      {adaptive && (
        <Section label="Border">
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#111] border border-[#1a1a1a]">
            {BORDERS.map((border) => (
              <button
                key={border.id}
                type="button"
                onClick={() => update({ borderId: border.id, radius: border.radius })}
                className={
                  state.borderId === border.id
                    ? 'h-14 rounded-lg bg-[#1f1f1f] flex flex-col items-center justify-center gap-1.5 cursor-pointer'
                    : 'h-14 rounded-lg hover:bg-[#161616] flex flex-col items-center justify-center gap-1.5 cursor-pointer'
                }
              >
                <CornerPreview radius={border.id === 'sharp' ? 0 : border.id === 'curved' ? 6 : 14} />
                <span className={state.borderId === border.id ? 'text-[10px] text-white' : 'text-[10px] text-gray-500'}>{border.label}</span>
              </button>
            ))}
          </div>
          <div className="mt-2">
            <BarSlider label="Radius" value={state.radius} min={0} max={60} onChange={(radius) => update({ radius })} />
          </div>
        </Section>
      )}

      <Section label="Shadow">
        <div className="grid grid-cols-4 gap-x-2 gap-y-2">
          {SHADOW_MODES.map((mode) => (
            <Tile
              key={mode.id}
              label={mode.label}
              active={state.shadowMode === mode.id}
              onClick={() => update({ shadowMode: mode.id })}
              title={mode.id === 'adaptive' ? 'Sombra teñida con el color dominante de la captura' : mode.label}
            >
              <ShadowPreview mode={mode.id} />
            </Tile>
          ))}
        </div>
        <div className="mt-2">
          <BarSlider label="Opacity" value={state.shadowOpacity} min={0} max={100} onChange={(shadowOpacity) => update({ shadowOpacity })} />
        </div>
        <button
          type="button"
          onClick={() => setLightOpen((o) => !o)}
          className={
            lightOpen || state.lightIntensity > 0
              ? 'mt-2 w-full h-8 inline-flex items-center justify-center gap-2 text-xs text-[#22d3ee] cursor-pointer'
              : 'mt-2 w-full h-8 inline-flex items-center justify-center gap-2 text-xs text-gray-300 hover:text-white cursor-pointer'
          }
        >
          <IconAdjustments size={14} />
          Adjust Light
        </button>
        {lightOpen && (
          <div className="space-y-2">
            <BarSlider label="Intensidad" value={state.lightIntensity} min={0} max={100} onChange={(lightIntensity) => update({ lightIntensity })} />
            <BarSlider label="Ángulo" value={state.lightAngle} min={0} max={360} suffix="°" onChange={(lightAngle) => update({ lightAngle })} />
          </div>
        )}
      </Section>

      <Section label="Visibility">
        <button
          type="button"
          onClick={() => update({ hideMockup: !state.hideMockup })}
          className={
            state.hideMockup
              ? 'w-full h-9 rounded-lg bg-[#22d3ee] text-black text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer'
              : 'w-full h-9 rounded-lg bg-[#111] border border-[#1a1a1a] text-white text-xs font-semibold inline-flex items-center justify-center gap-2 hover:border-[#2a2a2a] cursor-pointer'
          }
        >
          {state.hideMockup ? <IconEyeOff size={15} /> : <IconEye size={15} />}
          {state.hideMockup ? 'Show Mockup' : 'Hide Mockup'}
        </button>
      </Section>

      <Section label="Details">
        <dl className="rounded-lg border border-[#1a1a1a] p-2.5 space-y-1.5 text-[11px]">
          <div className="flex justify-between gap-2">
            <dt className="text-gray-500">Dispositivo</dt>
            <dd className="text-gray-200 truncate">{device.label}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-gray-500">Píxeles de pantalla</dt>
            <dd className="text-gray-200 truncate">{formatScreen(device)}</dd>
          </div>
        </dl>
      </Section>
    </div>
  )
}
