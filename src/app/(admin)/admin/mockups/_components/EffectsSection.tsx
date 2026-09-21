'use client'

/* eslint-disable @next/next/no-img-element */
// The watermark logo preview is an in-memory data URL.

import { useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { EASE, SPRING, flyout, stagger } from './motion'
import {
  IconAperture,
  IconBlur,
  IconChevronLeft,
  IconChevronRight,
  IconCircleOff,
  IconDroplet,
  IconPhoto,
  IconSparkles,
  IconTrash,
} from '@tabler/icons-react'
import {
  VFX_OPTIONS,
  WATERMARK_POSITIONS,
  WATERMARK_PRESETS,
  WATERMARK_STYLES,
  buildVfxLayers,
  type MockupState,
  type WatermarkStyle,
} from '@/lib/mockup'
import { BarSlider, Section, SectionLabel, Segmented, Tile, useAnchoredPanel, useOutsideClick } from './ui'

type Effect = 'portrait' | 'watermark' | 'bg' | 'vfx'

type Props = {
  state: MockupState
  update: (patch: Partial<MockupState>) => void
}

/** Sample scene the effect previews are painted over. */
const PREVIEW_BG = 'linear-gradient(135deg, #fb923c 0%, #ec4899 55%, #8b5cf6 100%)'

function EffectButton({ icon, label, active, open, onClick }: { icon: ReactNode; label: string; active: boolean; open: boolean; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.95 }}
      transition={SPRING}
      className={
        open
          ? 'h-16 rounded-xl bg-[#1f1f1f] border border-[#22d3ee]/50 flex flex-col items-center justify-center gap-1.5 cursor-pointer'
          : 'h-16 rounded-xl bg-[#111] border border-[#1a1a1a] hover:border-[#2a2a2a] flex flex-col items-center justify-center gap-1.5 cursor-pointer'
      }
    >
      {/* The icon gives a small spring pop when its effect switches on */}
      <motion.span
        animate={{ scale: active ? [1, 1.25, 1] : 1 }}
        transition={{ duration: 0.35 }}
        className={active ? 'text-[#22d3ee]' : 'text-gray-300'}
      >
        {icon}
      </motion.span>
      <span className="text-[11px] text-gray-300">{label}</span>
    </motion.button>
  )
}

/** Panel that opens beside the left column, like the effect panels of shots.so. */
function Flyout({ anchorRef, icon, title, children }: { anchorRef: React.RefObject<HTMLElement | null>; icon: ReactNode; title: string; children: ReactNode }) {
  const style = useAnchoredPanel(anchorRef, true, 'right')
  return (
    <motion.div
      variants={flyout}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{ ...style, transformOrigin: 'left top' }}
      className="z-50 w-[300px] overflow-y-auto scrollbar-neon rounded-2xl bg-[#141414] border border-[#1f1f1f] shadow-2xl shadow-black/60"
    >
      <div className="relative h-20 overflow-hidden rounded-t-2xl" style={{ background: PREVIEW_BG }}>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#141414]" />
        <p className="absolute left-4 bottom-2 flex items-center gap-2 text-lg font-semibold text-white">
          {icon}
          {title}
        </p>
      </div>
      <motion.div className="p-3 space-y-3" variants={stagger} initial="hidden" animate="visible">
        {children}
      </motion.div>
    </motion.div>
  )
}

function VfxPreview({ id }: { id: (typeof VFX_OPTIONS)[number]['id'] }) {
  if (id === 'none') return <IconCircleOff size={18} className="text-gray-400" />
  return (
    <span className="relative w-full h-full" style={{ background: PREVIEW_BG }}>
      {buildVfxLayers(id, 85).map((layer, i) => (
        <span
          key={i}
          className="absolute inset-0"
          style={{ background: layer.background, backgroundSize: layer.backgroundSize, opacity: layer.opacity, mixBlendMode: layer.mixBlendMode as React.CSSProperties['mixBlendMode'] }}
        />
      ))}
    </span>
  )
}

function WatermarkStylePreview({ style }: { style: WatermarkStyle }) {
  const label = <span className="text-[9px] font-semibold">sebascm</span>
  const variants: Record<WatermarkStyle, ReactNode> = {
    default: <span className="text-white">{label}</span>,
    shadow: <span className="text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.6)]">{label}</span>,
    glass: <span className="text-white px-1.5 py-0.5 rounded-full bg-black/30 border border-white/30">{label}</span>,
    badge: <span className="text-black px-1.5 py-0.5 rounded-full bg-white shadow">{label}</span>,
  }
  return (
    <span className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1e3a8a, #6366f1)' }}>
      {variants[style]}
    </span>
  )
}

export function EffectsSection({ state, update }: Props) {
  const [effect, setEffect] = useState<Effect | null>(null)
  const [presetIndex, setPresetIndex] = useState(0)
  const sectionRef = useRef<HTMLDivElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  // The flyout is a DOM child of this section (only visually outside it), so
  // clicking the same button again toggles it instead of counting as outside.
  useOutsideClick(sectionRef, effect !== null, () => setEffect(null))

  const toggle = (next: Effect) => setEffect((current) => (current === next ? null : next))

  const cyclePreset = (direction: 1 | -1) => {
    const next = (presetIndex + direction + WATERMARK_PRESETS.length) % WATERMARK_PRESETS.length
    setPresetIndex(next)
    update(WATERMARK_PRESETS[next].patch)
  }

  const pickLogo = (file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => update({ watermarkImage: String(reader.result), watermarkEnabled: true })
    reader.readAsDataURL(file)
  }

  return (
    <div ref={sectionRef}>
      <Section label="Effects & Watermark">
        <div className="grid grid-cols-2 gap-2">
          <EffectButton icon={<IconAperture size={18} />} label="Portrait" active={state.portraitMode !== 'none'} open={effect === 'portrait'} onClick={() => toggle('portrait')} />
          <EffectButton icon={<IconDroplet size={18} />} label="Watermark" active={state.watermarkEnabled} open={effect === 'watermark'} onClick={() => toggle('watermark')} />
          <EffectButton icon={<IconBlur size={18} />} label="Bg Effects" active={state.noise > 0 || state.bgBlur > 0 || state.vignette > 0} open={effect === 'bg'} onClick={() => toggle('bg')} />
          <EffectButton icon={<IconSparkles size={18} />} label="VFX" active={state.vfx !== 'none'} open={effect === 'vfx'} onClick={() => toggle('vfx')} />
        </div>
      </Section>

      {/* mode="wait": one flyout leaves before the next one slides in */}
      <AnimatePresence mode="wait">
      {effect === 'portrait' && (
        <Flyout key="portrait" anchorRef={sectionRef} icon={<IconAperture size={18} />} title="Portrait">
          <div className="grid grid-cols-3 gap-2">
            <Tile label="None" active={state.portraitMode === 'none'} onClick={() => update({ portraitMode: 'none' })}>
              <IconCircleOff size={18} className="text-gray-400" />
            </Tile>
            <Tile label="Lens Blur" active={state.portraitMode === 'lens'} onClick={() => update({ portraitMode: 'lens' })}>
              <span className="w-full h-full blur-[3px] scale-110" style={{ background: PREVIEW_BG }} />
            </Tile>
            <Tile label="Stage" active={state.portraitMode === 'stage'} onClick={() => update({ portraitMode: 'stage' })}>
              <span className="w-full h-full" style={{ background: `radial-gradient(ellipse 50% 55% at 50% 45%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.8) 100%), ${PREVIEW_BG}` }} />
            </Tile>
          </div>
          {state.portraitMode !== 'none' && (
            <BarSlider label="Intensidad" value={state.portraitBlur} min={4} max={60} onChange={(portraitBlur) => update({ portraitBlur })} />
          )}
        </Flyout>
      )}

      {effect === 'watermark' && (
        <Flyout key="watermark" anchorRef={sectionRef} icon={<IconDroplet size={18} />} title="Watermark">
          {/* Preset carousel */}
          <div>
            <div className="flex items-center justify-between">
              <button type="button" aria-label="Preset anterior" onClick={() => cyclePreset(-1)} className="p-1 text-gray-400 hover:text-white cursor-pointer">
                <IconChevronLeft size={16} />
              </button>
              <span className="relative h-5 flex-1 overflow-hidden text-center">
                {/* The preset name slides like a carousel card */}
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={presetIndex}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={EASE}
                    className="absolute inset-0 text-sm text-white font-semibold"
                  >
                    {WATERMARK_PRESETS[presetIndex].label}
                  </motion.span>
                </AnimatePresence>
              </span>
              <button type="button" aria-label="Preset siguiente" onClick={() => cyclePreset(1)} className="p-1 text-gray-400 hover:text-white cursor-pointer">
                <IconChevronRight size={16} />
              </button>
            </div>
            <div className="flex justify-center gap-1.5 mt-1.5">
              {WATERMARK_PRESETS.map((preset, i) => (
                // The active dot stretches into a pill, like a carousel indicator
                <motion.span
                  key={preset.id}
                  animate={{ width: i === presetIndex ? 14 : 6, opacity: i === presetIndex ? 1 : 0.3 }}
                  transition={SPRING}
                  className="h-1.5 rounded-full bg-white"
                />
              ))}
            </div>
          </div>

          {/* Content: a logo or a line of text */}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) pickLogo(file)
              e.target.value = ''
            }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              title={state.watermarkImage ? 'Cambiar logo' : 'Usar un logo'}
              onClick={() => logoInputRef.current?.click()}
              className="w-10 h-10 shrink-0 rounded-lg bg-[#111] border border-[#1a1a1a] hover:border-[#2a2a2a] flex items-center justify-center overflow-hidden cursor-pointer"
            >
              {state.watermarkImage ? <img src={state.watermarkImage} alt="" className="w-full h-full object-contain p-1" /> : <IconPhoto size={16} className="text-gray-400" />}
            </button>
            {state.watermarkImage ? (
              <button
                type="button"
                onClick={() => update({ watermarkImage: null })}
                className="flex-1 h-10 rounded-lg bg-[#111] border border-[#1a1a1a] text-[11px] text-gray-400 hover:text-white inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <IconTrash size={13} /> Quitar logo y usar texto
              </button>
            ) : (
              <input
                type="text"
                value={state.watermarkText}
                maxLength={40}
                placeholder="Watermark"
                onChange={(e) => update({ watermarkText: e.target.value, watermarkEnabled: true })}
                className="flex-1 h-10 px-3 rounded-lg bg-[#111] border border-[#1a1a1a] text-xs text-white font-[var(--font-fira-code)] outline-none focus:border-[#22d3ee]"
              />
            )}
          </div>

          <div>
            <SectionLabel>Style</SectionLabel>
            <div className="grid grid-cols-4 gap-2">
              {WATERMARK_STYLES.map((style) => (
                <Tile key={style.id} label={style.label} active={state.watermarkStyle === style.id} onClick={() => update({ watermarkStyle: style.id, watermarkEnabled: true })}>
                  <WatermarkStylePreview style={style.id} />
                </Tile>
              ))}
            </div>
          </div>

          <Segmented
            options={[
              { id: 'light', label: 'Light' },
              { id: 'dark', label: 'Dark' },
            ]}
            value={state.watermarkTheme}
            onChange={(watermarkTheme) => update({ watermarkTheme })}
          />

          <div>
            <SectionLabel>Size & Position</SectionLabel>
            <div className="flex gap-2">
              <div className="grid grid-cols-3 gap-1 p-1.5 rounded-lg bg-[#111] border border-[#1a1a1a]" role="radiogroup" aria-label="Posición">
                {WATERMARK_POSITIONS.map((position) => (
                  <button
                    key={position}
                    type="button"
                    role="radio"
                    aria-checked={state.watermarkPosition === position}
                    aria-label={position}
                    onClick={() => update({ watermarkPosition: position, watermarkEnabled: true })}
                    className={
                      state.watermarkPosition === position
                        ? 'w-5 h-5 rounded bg-[#22d3ee] cursor-pointer'
                        : 'w-5 h-5 rounded bg-[#1f1f1f] hover:bg-[#2a2a2a] cursor-pointer'
                    }
                  />
                ))}
              </div>
              <div className="flex-1 space-y-2">
                <BarSlider label="Size" value={state.watermarkSize} min={30} max={200} onChange={(watermarkSize) => update({ watermarkSize })} />
                <BarSlider label="Inset" value={state.watermarkInset} min={0} max={15} onChange={(watermarkInset) => update({ watermarkInset })} />
              </div>
            </div>
          </div>
        </Flyout>
      )}

      {effect === 'bg' && (
        <Flyout key="bg" anchorRef={sectionRef} icon={<IconBlur size={18} />} title="Background effects">
          <BarSlider label="Noise" value={state.noise} min={0} max={100} onChange={(noise) => update({ noise })} />
          <BarSlider label="Blur" value={state.bgBlur} min={0} max={60} onChange={(bgBlur) => update({ bgBlur })} />
          <BarSlider label="Vignette" value={state.vignette} min={0} max={100} onChange={(vignette) => update({ vignette })} />
        </Flyout>
      )}

      {effect === 'vfx' && (
        <Flyout key="vfx" anchorRef={sectionRef} icon={<IconSparkles size={18} />} title="VFX">
          <div className="grid grid-cols-3 gap-x-2 gap-y-2.5">
            {VFX_OPTIONS.map((option) => (
              <Tile key={option.id} label={option.label} active={state.vfx === option.id} onClick={() => update({ vfx: option.id })}>
                <VfxPreview id={option.id} />
              </Tile>
            ))}
          </div>
          <div>
            <SectionLabel>Adjust</SectionLabel>
            <BarSlider label="Intensity" value={state.vfxIntensity} min={0} max={100} onChange={(vfxIntensity) => update({ vfxIntensity })} />
          </div>
        </Flyout>
      )}
      </AnimatePresence>
    </div>
  )
}
