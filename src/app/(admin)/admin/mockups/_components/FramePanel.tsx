'use client'

import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SPRING } from './motion'
import {
  IconBrandUnsplash,
  IconChevronDown,
  IconColorPicker,
  IconPhoto,
  IconPlus,
  IconRefresh,
  IconSparkles,
  IconX,
} from '@tabler/icons-react'
import { BACKGROUND_CATEGORIES, type BackgroundPreset, type MockupState } from '@/lib/mockup'
import { MAGIC_GROUPS, mixHex } from '@/lib/mockup/palette'
import { EffectsSection } from './EffectsSection'
import { SceneSection } from './SceneSection'
import { SizePicker } from './SizePicker'
import { Section, Tile, Toggle } from './ui'

/** Most colours the palette row holds, matching what the screenshot yields. */
const MAX_PALETTE = 5

type Props = {
  state: MockupState
  update: (patch: Partial<MockupState>) => void
  /** Backgrounds generated from the screenshot's palette; empty without one. */
  magic: BackgroundPreset[]
  /** Colours Magic builds from: extracted from the screenshot or hand-edited. */
  palette: string[]
  paletteCustomized: boolean
  onPaletteChange: (colors: string[]) => void
  onPaletteReset: () => void
  magicAuto: boolean
  onMagicAutoChange: (on: boolean) => void
  hasImage: boolean
  backgroundImage: string | null
  onPickBackground: (file: File) => void
}

const CHECKER = 'repeating-conic-gradient(#3a3a3a 0% 25%, #222 0% 50%) 50% / 10px 10px'

function Swatch({ preset, active, onClick }: { preset: BackgroundPreset; active: boolean; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      title={preset.label}
      onClick={onClick}
      // Swatches revealed by "see all" fade and grow into place
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.92 }}
      transition={SPRING}
      style={{ background: preset.css }}
      className={
        active
          ? 'aspect-[4/3] rounded-lg ring-2 ring-[#22d3ee] ring-offset-2 ring-offset-[#0d0d0d] cursor-pointer'
          : 'aspect-[4/3] rounded-lg border border-[#1a1a1a] hover:border-[#3a3a3a] transition-colors cursor-pointer'
      }
    />
  )
}

export function FramePanel({
  state,
  update,
  magic,
  palette,
  paletteCustomized,
  onPaletteChange,
  onPaletteReset,
  magicAuto,
  onMagicAutoChange,
  hasImage,
  backgroundImage,
  onPickBackground,
}: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const bgInputRef = useRef<HTMLInputElement>(null)
  const colorInputRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      <div className="px-3 pt-3">
        <SizePicker
          sizeId={state.sizeId}
          width={state.width}
          height={state.height}
          onChange={(next) => update(next)}
        />
      </div>

      <EffectsSection state={state} update={update} />
      <SceneSection state={state} update={update} />

      <Section label="Background">
        <input
          ref={bgInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onPickBackground(file)
            e.target.value = ''
          }}
        />
        <input
          ref={colorInputRef}
          type="color"
          value={state.customColor}
          onChange={(e) => update({ customColor: e.target.value, backgroundId: 'color' })}
          className="sr-only"
          tabIndex={-1}
        />
        <div className="grid grid-cols-4 gap-2">
          <Tile label="Trans..." title="Transparente" active={state.backgroundId === 'transparent'} onClick={() => update({ backgroundId: 'transparent' })}>
            <span className="w-full h-full" style={{ background: CHECKER }} />
          </Tile>
          <Tile label="Color" active={state.backgroundId === 'color'} onClick={() => colorInputRef.current?.click()}>
            {state.backgroundId === 'color' ? (
              <span className="w-full h-full" style={{ background: state.customColor }} />
            ) : (
              <IconColorPicker size={18} className="text-gray-300" />
            )}
          </Tile>
          <Tile
            label="Image"
            title="Imagen propia de fondo"
            active={state.backgroundId === 'image'}
            onClick={() => (backgroundImage ? update({ backgroundId: 'image' }) : bgInputRef.current?.click())}
          >
            {backgroundImage ? (
              <span className="w-full h-full" style={{ background: `url("${backgroundImage}") center / cover` }} />
            ) : (
              <IconPhoto size={18} className="text-gray-300" />
            )}
          </Tile>
          <Tile label="Unspl..." title="Unsplash: pendiente de configurar la API key" disabled>
            <IconBrandUnsplash size={18} className="text-gray-300" />
          </Tile>
        </div>
        {backgroundImage && (
          <button type="button" onClick={() => bgInputRef.current?.click()} className="mt-1.5 text-[10px] text-gray-500 hover:text-white cursor-pointer">
            Cambiar imagen de fondo
          </button>
        )}

        {/* Magic */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm text-white font-semibold">
              Magic <IconSparkles size={14} className="text-[#22d3ee]" />
            </p>
            <Toggle
              checked={magicAuto}
              disabled={!hasImage}
              onChange={onMagicAutoChange}
              label="Aplicar automáticamente el fondo Magic que mejor contrasta"
            />
          </div>
          <p className="text-[10px] text-gray-500 leading-relaxed mb-2.5">
            {magicAuto ? 'Activado: cada captura nueva estrena fondo a juego.' : 'Fondos generados con los colores de tu captura.'}
          </p>

          {hasImage && magic.length > 0 ? (
            <>
              {/* Palette — every chip is a colour input */}
              <div className="flex items-center gap-1.5">
                <AnimatePresence initial={false}>
                {palette.map((hex, index) => (
                  <motion.div
                    key={index}
                    layout
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={SPRING}
                    className="relative flex-1 group/chip"
                  >
                    <label
                      className="block h-7 rounded-md border border-white/10 cursor-pointer overflow-hidden"
                      style={{ background: hex }}
                      title={`${hex} · tocá para cambiarlo`}
                    >
                      <input
                        type="color"
                        value={hex}
                        onChange={(e) => onPaletteChange(palette.map((c, i) => (i === index ? e.target.value : c)))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        aria-label={`Color ${index + 1} de la paleta`}
                      />
                    </label>
                    {palette.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Quitar el color ${index + 1}`}
                        onClick={() => onPaletteChange(palette.filter((_, i) => i !== index))}
                        className="absolute -right-1 -top-1 w-4 h-4 rounded-full bg-[#1f1f1f] border border-[#2a2a2a] text-gray-300 hover:text-white flex items-center justify-center opacity-0 group-hover/chip:opacity-100 transition-opacity cursor-pointer"
                      >
                        <IconX size={9} />
                      </button>
                    )}
                  </motion.div>
                ))}
                </AnimatePresence>
                {palette.length < MAX_PALETTE && (
                  <motion.button
                    layout
                    whileTap={{ scale: 0.9 }}
                    transition={SPRING}
                    type="button"
                    aria-label="Añadir un color a la paleta"
                    onClick={() => onPaletteChange([...palette, mixHex(palette[palette.length - 1], '#ffffff', 0.4)])}
                    className="flex-1 h-7 rounded-md border border-dashed border-[#2a2a2a] text-gray-400 hover:text-[#22d3ee] hover:border-[#22d3ee]/60 flex items-center justify-center cursor-pointer"
                  >
                    <IconPlus size={13} />
                  </motion.button>
                )}
                {paletteCustomized && (
                  <button
                    type="button"
                    title="Volver a los colores de la captura"
                    onClick={onPaletteReset}
                    className="w-7 h-7 shrink-0 rounded-md bg-[#1a1a1a] text-gray-400 hover:text-white flex items-center justify-center cursor-pointer"
                  >
                    <IconRefresh size={13} />
                  </button>
                )}
              </div>
              <p className="mt-1.5 mb-3 text-[10px] text-gray-600 text-center">Tocá un color para personalizar la paleta</p>

              {MAGIC_GROUPS.map((group) => {
                const presets = magic.filter((m) => m.group === group.id)
                if (presets.length === 0) return null
                const key = `magic-${group.id}`
                const open = expanded[key]
                return (
                  <div key={group.id} className="mt-2.5">
                    <p className="text-[11px] text-gray-500 mb-1.5">{group.label}</p>
                    <div className="grid grid-cols-4 gap-2">
                      {(open ? presets : presets.slice(0, 3)).map((preset) => (
                        <Swatch key={preset.id} preset={preset} active={state.backgroundId === preset.id} onClick={() => update({ backgroundId: preset.id })} />
                      ))}
                      {presets.length > 3 && (
                        <button
                          type="button"
                          title={open ? 'Ver menos' : 'Ver todos'}
                          onClick={() => setExpanded((e) => ({ ...e, [key]: !open }))}
                          className="aspect-[4/3] rounded-lg bg-[#1a1a1a] hover:bg-[#222] text-gray-300 flex items-center justify-center cursor-pointer"
                        >
                          <IconChevronDown size={15} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </>
          ) : (
            <p className="text-[11px] text-gray-600 rounded-lg border border-dashed border-[#1f1f1f] px-3 py-3 text-center">
              Subí una captura para generarlos
            </p>
          )}
        </div>

        {BACKGROUND_CATEGORIES.map((category) => {
          const open = expanded[category.id]
          const visible = open ? category.presets : category.presets.slice(0, 3)
          return (
            <div key={category.id} className="mt-4">
              <p className="text-sm text-white font-semibold mb-2">{category.label}</p>
              <div className="grid grid-cols-4 gap-2">
                {visible.map((preset) => (
                  <Swatch key={preset.id} preset={preset} active={state.backgroundId === preset.id} onClick={() => update({ backgroundId: preset.id })} />
                ))}
                {category.presets.length > 3 && (
                  <button
                    type="button"
                    title={open ? 'Ver menos' : 'Ver todos'}
                    onClick={() => setExpanded((e) => ({ ...e, [category.id]: !open }))}
                    className="aspect-[4/3] rounded-lg bg-[#1a1a1a] hover:bg-[#222] text-gray-300 flex items-center justify-center cursor-pointer"
                  >
                    <IconChevronDown size={15} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </Section>
    </div>
  )
}
