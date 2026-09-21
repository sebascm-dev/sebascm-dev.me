'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { IconAdjustmentsHorizontal, IconArrowUp, IconCheck, IconCopy } from '@tabler/icons-react'
import { EASE, SPRING, popover, stagger, staggerItem } from './motion'
import {
  EXPORT_FORMATS,
  EXPORT_SCALES,
  LAYOUTS,
  OFFSET_LIMIT,
  arrangementsFor,
  buildTransform,
  clampNumber,
  formatResolution,
  padFromTilt,
  qualityLabel,
  resolveOutputSize,
  tiltFromPad,
  type Arrangement,
  type DeviceCount,
  type DragMode,
  type Layout,
  type MockupState,
} from '@/lib/mockup'
import { BarSlider, SectionLabel, Segmented, useOutsideClick } from './ui'

type Props = {
  state: MockupState
  update: (patch: Partial<MockupState>) => void
  /** Resolved CSS background, so the thumbnails match the canvas. */
  background: string
  mode: DragMode
  onModeChange: (mode: DragMode) => void
  onCountChange: (count: DeviceCount) => void
  exporting: boolean
  canExport: boolean
  /** Both resolve true on success, which briefly turns their icon into a check. */
  onExport: () => Promise<boolean>
  onCopy: () => Promise<boolean>
  onApplyLayout: (layout: Layout) => void
  /** Screenshot of each device slot, so thumbnails show the real content. */
  slotImages: (string | null)[]
  /** Width / height of the first screenshot, to shape the thumbnails. */
  previewAspect: number | null
}

type Preview = Pick<Props, 'slotImages' | 'previewAspect'>

/**
 * Stands in for a device inside thumbnails and pads: the user's screenshot
 * when there is one, a dark card otherwise.
 */
function MiniDevice({ transform, image, aspect }: { transform: string; image?: string | null; aspect?: number | null }) {
  return (
    <span
      className="block rounded-[5px] bg-[#1c1c1c] border border-white/10 shadow-lg shadow-black/40 bg-cover bg-top"
      style={{
        transform,
        aspectRatio: String(image && aspect ? aspect : 16 / 10),
        backgroundImage: image ? `url("${image}")` : undefined,
      }}
    />
  )
}

/** Width a thumbnail device gets: tall screenshots are narrowed to fit. */
function miniWidth(zoom: number, aspect: number | null | undefined, canvasAspect: number) {
  const fit = aspect && aspect < canvasAspect ? aspect / canvasAspect : 1
  return zoom * 0.7 * fit
}

/** Tracks a pointer drag on an element, reporting its position as 0-1 fractions. */
function usePadDrag(onMove: (x: number, y: number, precise: boolean) => void) {
  const ref = useRef<HTMLDivElement>(null)
  const report = (clientX: number, clientY: number, precise: boolean) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    onMove(clampNumber((clientX - rect.left) / rect.width, 0, 1), clampNumber((clientY - rect.top) / rect.height, 0, 1), precise)
  }
  return {
    ref,
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      report(e.clientX, e.clientY, e.shiftKey)
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) report(e.clientX, e.clientY, e.shiftKey)
    },
  }
}

/** Arrow-key nudging shared by both pads; Shift makes the step bigger. */
function arrowStep(e: React.KeyboardEvent): [number, number] | null {
  const step = e.shiftKey ? 10 : 2
  const moves: Record<string, [number, number]> = {
    ArrowLeft: [-step, 0],
    ArrowRight: [step, 0],
    ArrowUp: [0, -step],
    ArrowDown: [0, step],
  }
  return moves[e.key] ?? null
}

/** Drag the dot to move the composition; the box has the canvas proportions. */
function PositionPad({ state, update, background, slotImages, previewAspect }: Pick<Props, 'state' | 'update' | 'background'> & Preview) {
  const drag = usePadDrag((x, y) =>
    update({ offsetX: Math.round((x - 0.5) * 2 * OFFSET_LIMIT), offsetY: Math.round((y - 0.5) * 2 * OFFSET_LIMIT) }),
  )

  return (
    <div
      {...drag}
      // A 2D pad does not fit the single-axis ARIA slider role, so it is a
      // focusable group that the arrow keys move instead.
      role="group"
      aria-label={`Posición: x ${state.offsetX}, y ${state.offsetY}. Usá las flechas para moverla.`}
      tabIndex={0}
      onKeyDown={(e) => {
        const move = arrowStep(e)
        if (!move) return
        e.preventDefault()
        update({
          offsetX: clampNumber(state.offsetX + move[0], -OFFSET_LIMIT, OFFSET_LIMIT),
          offsetY: clampNumber(state.offsetY + move[1], -OFFSET_LIMIT, OFFSET_LIMIT),
        })
      }}
      onDoubleClick={() => update({ offsetX: 0, offsetY: 0 })}
      className="relative w-full rounded-xl overflow-hidden cursor-crosshair touch-none select-none border border-[#1a1a1a] outline-none focus-visible:ring-2 focus-visible:ring-[#22d3ee]"
      style={{ aspectRatio: `${state.width} / ${state.height}`, background }}
    >
      <span className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: `translate(${state.offsetX}%, ${state.offsetY}%)` }}>
        <span style={{ width: `${miniWidth(state.zoom, previewAspect, state.width / state.height)}%` }}>
          <MiniDevice transform="none" image={slotImages[0]} aspect={previewAspect} />
        </span>
      </span>
      <span
        className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full bg-white shadow-lg ring-2 ring-black/20 pointer-events-none"
        style={{ left: `${50 + state.offsetX}%`, top: `${50 + state.offsetY}%` }}
      />
    </div>
  )
}

/**
 * The shots.so tilt control: a live preview of the tilted device plus a handle
 * to drag. Horizontal travel turns it around Y, vertical travel around X, and
 * Shift moves the handle a quarter as fast for fine adjustments.
 */
function TiltPad({ state, update, background, slotImages, previewAspect }: Pick<Props, 'state' | 'update' | 'background'> & Preview) {
  const anchor = useRef<{ x: number; y: number; rotateX: number; rotateY: number } | null>(null)
  const drag = usePadDrag((x, y, precise) => {
    if (!precise) {
      anchor.current = null
      update(tiltFromPad(x, y))
      return
    }
    // Precision: move relative to where Shift was pressed, at a quarter speed.
    anchor.current ??= { x, y, rotateX: state.rotateX, rotateY: state.rotateY }
    const a = anchor.current
    const target = padFromTilt(a.rotateX, a.rotateY)
    update(tiltFromPad(target.x + (x - a.x) * 0.25, target.y + (y - a.y) * 0.25))
  })
  const handle = padFromTilt(state.rotateX, state.rotateY)

  return (
    <div
      {...drag}
      onPointerUp={() => {
        anchor.current = null
      }}
      role="group"
      aria-label={`Inclinación: ${state.rotateX}° en X, ${state.rotateY}° en Y. Usá las flechas para inclinar.`}
      tabIndex={0}
      onKeyDown={(e) => {
        const move = arrowStep(e)
        if (!move) return
        e.preventDefault()
        // Up tips the top edge back (+X), matching the drag direction.
        update({
          rotateX: clampNumber(state.rotateX - move[1], -60, 60),
          rotateY: clampNumber(state.rotateY + move[0], -60, 60),
        })
      }}
      onDoubleClick={() => update({ rotateX: 0, rotateY: 0 })}
      className="relative w-full rounded-xl overflow-hidden cursor-grab active:cursor-grabbing touch-none select-none border border-[#1a1a1a] outline-none focus-visible:ring-2 focus-visible:ring-[#22d3ee]"
      style={{ aspectRatio: `${state.width} / ${state.height}`, background }}
    >
      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span style={{ width: `${miniWidth(state.zoom, previewAspect, state.width / state.height)}%` }}>
          <MiniDevice
            image={slotImages[0]}
            aspect={previewAspect}
            transform={buildTransform({
              rotateX: state.rotateX,
              rotateY: state.rotateY,
              rotateZ: state.rotateZ,
              perspective: Math.round(state.perspective / 3),
            })}
          />
        </span>
      </span>
      {/* The guide drops from the top edge to the handle, as in shots.so */}
      <span className="absolute top-0 w-px bg-white/80 pointer-events-none" style={{ left: `${handle.x * 100}%`, height: `${handle.y * 100}%` }} />
      <span
        className="absolute w-7 h-7 -ml-3.5 -mt-3.5 rounded-full bg-white/95 border-2 border-white shadow-lg shadow-black/30 ring-1 ring-black/10 pointer-events-none"
        style={{ left: `${handle.x * 100}%`, top: `${handle.y * 100}%` }}
      />
    </div>
  )
}

function ThumbButton({
  active,
  title,
  state,
  background,
  onClick,
  children,
}: {
  active: boolean
  title: string
  state: MockupState
  background: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <motion.button
      type="button"
      title={title}
      onClick={onClick}
      variants={staggerItem}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className={
        active
          ? 'relative w-full rounded-xl overflow-hidden ring-2 ring-[#22d3ee] ring-offset-2 ring-offset-[#0d0d0d] cursor-pointer'
          : 'relative w-full rounded-xl overflow-hidden border border-[#1a1a1a] hover:border-[#3a3a3a] transition-colors cursor-pointer'
      }
      style={{ aspectRatio: `${state.width} / ${state.height}`, background }}
    >
      {children}
    </motion.button>
  )
}

/** An icon that swaps to a check with a little pop while `done` is true. */
function SwapIcon({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={done ? 'done' : 'idle'}
        initial={{ scale: 0.4, opacity: 0, rotate: done ? -30 : 0 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        exit={{ scale: 0.4, opacity: 0 }}
        transition={SPRING}
        className={done ? 'inline-flex text-emerald-600' : 'inline-flex'}
      >
        {done ? <IconCheck size={16} stroke={2.5} /> : children}
      </motion.span>
    </AnimatePresence>
  )
}

function LayoutThumb({ layout, state, background, onClick, slotImages, previewAspect }: { layout: Layout; state: MockupState; background: string; onClick: () => void } & Preview) {
  const active =
    state.zoom === layout.zoom &&
    state.offsetX === layout.offsetX &&
    state.offsetY === layout.offsetY &&
    state.rotateX === layout.rotateX &&
    state.rotateY === layout.rotateY &&
    state.rotateZ === layout.rotateZ

  return (
    <ThumbButton active={active} title={layout.label} state={state} background={background} onClick={onClick}>
      <span className="absolute inset-0 flex items-center justify-center" style={{ transform: `translate(${layout.offsetX}%, ${layout.offsetY}%)` }}>
        <span style={{ width: `${miniWidth(layout.zoom, previewAspect, state.width / state.height)}%` }}>
          <MiniDevice transform={buildTransform({ ...layout, perspective: 400 })} image={slotImages[0]} aspect={previewAspect} />
        </span>
      </span>
    </ThumbButton>
  )
}

function ArrangementThumb({ arrangement, state, background, onClick, slotImages }: { arrangement: Arrangement; state: MockupState; background: string; onClick: () => void } & Preview) {
  return (
    <ThumbButton active={state.arrangementId === arrangement.id} title={arrangement.label} state={state} background={background} onClick={onClick}>
      {arrangement.slots.map((slot, index) => (
        <span
          key={index}
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: `translate(${slot.x}%, ${slot.y}%)`, zIndex: slot.z ?? index }}
        >
          <span style={{ width: `${80 * slot.scale}%` }}>
            <MiniDevice transform={buildTransform({ ...slot, perspective: 400 })} image={slotImages[index]} />
          </span>
        </span>
      ))}
    </ThumbButton>
  )
}

/** One, two or three bars — the device-count icons of the selector. */
function CountIcon({ count }: { count: DeviceCount }) {
  return (
    <span className="flex gap-[3px]">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="w-[5px] h-3.5 rounded-[2px] bg-current" />
      ))}
    </span>
  )
}

export function SidePanel({
  state,
  update,
  background,
  mode,
  onModeChange,
  onCountChange,
  exporting,
  canExport,
  onExport,
  onCopy,
  onApplyLayout,
  slotImages,
  previewAspect,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [done, setDone] = useState<'export' | 'copy' | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  useOutsideClick(menuRef, menuOpen, () => setMenuOpen(false))

  // The check stays for a moment, then the icon returns.
  useEffect(() => {
    if (!done) return
    const timer = window.setTimeout(() => setDone(null), 1400)
    return () => window.clearTimeout(timer)
  }, [done])

  const run = async (action: 'export' | 'copy') => {
    const ok = await (action === 'export' ? onExport() : onCopy())
    if (ok) setDone(action)
  }

  const output = resolveOutputSize(state.width, state.height, state.exportScale)
  const format = EXPORT_FORMATS.find((f) => f.id === state.exportFormat)!
  const preview = { slotImages, previewAspect }

  return (
    <div className="flex flex-col h-full">
      {/* Export — outside the scrolling body so its menu is never clipped.
          As in shots.so, the pill exports straight away with the current
          settings; the icons beside it copy the image or open the settings. */}
      <div ref={menuRef} className="relative p-3 border-b border-[#1a1a1a]">
        <div className="flex items-center h-11 rounded-xl bg-white text-black pl-1 pr-1.5">
          <motion.button
            type="button"
            onClick={() => run('export')}
            disabled={exporting || !canExport}
            whileTap={{ scale: 0.97 }}
            title={canExport ? 'Descargar (Ctrl+E)' : 'Subí una captura primero'}
            className="flex-1 h-9 rounded-lg inline-flex items-center justify-center gap-2 font-semibold text-sm hover:bg-black/5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <SwapIcon done={done === 'export'}>
              {exporting ? (
                // A gentle bob while the image renders
                <motion.span animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.8, ease: 'easeInOut' }} className="inline-flex">
                  <IconArrowUp size={16} />
                </motion.span>
              ) : (
                <IconArrowUp size={16} />
              )}
            </SwapIcon>
            {exporting ? 'Generando…' : done === 'export' ? '¡Listo!' : 'Export'}
            <span className="text-[11px] font-medium text-neutral-600">
              {state.exportScale}x · {format.label}
            </span>
          </motion.button>
          <motion.button
            type="button"
            onClick={() => run('copy')}
            disabled={exporting || !canExport}
            whileTap={{ scale: 0.88 }}
            aria-label="Copiar imagen al portapapeles (Ctrl+Shift+C)"
            title="Copiar imagen (Ctrl+Shift+C)"
            className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-neutral-700 hover:bg-black/5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <SwapIcon done={done === 'copy'}>
              <IconCopy size={16} />
            </SwapIcon>
          </motion.button>
          <motion.button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            whileTap={{ scale: 0.88 }}
            aria-label="Ajustes de exportación"
            aria-expanded={menuOpen}
            className={
              menuOpen
                ? 'w-8 h-8 rounded-lg inline-flex items-center justify-center bg-black/10 text-black cursor-pointer'
                : 'w-8 h-8 rounded-lg inline-flex items-center justify-center text-neutral-700 hover:bg-black/5 cursor-pointer'
            }
          >
            <motion.span animate={{ rotate: menuOpen ? 90 : 0 }} transition={SPRING} className="inline-flex">
              <IconAdjustmentsHorizontal size={16} />
            </motion.span>
          </motion.button>
        </div>

        <AnimatePresence>
        {menuOpen && (
          <motion.div
            variants={popover}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ transformOrigin: 'top right' }}
            className="absolute right-3 top-full mt-1 z-50 w-[280px] rounded-2xl bg-[#0d0d0d] border border-[#1f1f1f] shadow-2xl shadow-black/60 p-3 space-y-3"
          >
            <div>
              <SectionLabel>Export format</SectionLabel>
              <Segmented options={EXPORT_FORMATS.map((f) => ({ id: f.id, label: f.label }))} value={state.exportFormat} onChange={(exportFormat) => update({ exportFormat })} />
            </div>
            <div>
              <SectionLabel>Export quality</SectionLabel>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#111] border border-[#1a1a1a]">
                {EXPORT_SCALES.map((scale) => (
                  <button
                    key={scale}
                    type="button"
                    onClick={() => update({ exportScale: scale })}
                    className={
                      state.exportScale === scale
                        ? 'h-12 rounded-lg bg-[#1f1f1f] flex flex-col items-center justify-center cursor-pointer'
                        : 'h-12 rounded-lg hover:bg-[#161616] flex flex-col items-center justify-center cursor-pointer'
                    }
                  >
                    <span className={state.exportScale === scale ? 'text-sm text-white font-semibold' : 'text-sm text-gray-400'}>{scale}x</span>
                    <span className="text-[9px] text-gray-500 font-[var(--font-fira-code)]">{qualityLabel(state.width * scale)}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#1a1a1a] px-3 py-2 text-[11px]">
              <span className="text-gray-500">Output resolution</span>
              {/* Keyed by value so a new resolution slides in when it changes */}
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={formatResolution(output)}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={EASE}
                  className="text-[#22d3ee] font-[var(--font-fira-code)]"
                >
                  {formatResolution(output)}
                </motion.span>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-neon p-3 space-y-4">
        {/* Device count */}
        <Segmented
          options={([1, 2, 3] as const).map((count) => ({
            id: String(count) as '1' | '2' | '3',
            label: <CountIcon count={count} />,
            title: count === 1 ? '1 dispositivo' : `${count} dispositivos`,
          }))}
          value={String(state.count) as '1' | '2' | '3'}
          onChange={(value) => onCountChange(Number(value) as DeviceCount)}
        />

        {/* Zoom / Tilt — also decides what dragging on the canvas does */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="w-32">
              <Segmented
                size="sm"
                options={[
                  { id: 'zoom', label: 'Zoom' },
                  { id: 'tilt', label: 'Tilt' },
                ]}
                value={mode}
                onChange={onModeChange}
              />
            </div>
            {mode === 'tilt' && (
              <span className="text-[10px] text-gray-500 flex items-center gap-1">
                Mantené
                <kbd className="px-1 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-[9px] text-gray-300">⇧</kbd>
                para precisión
              </span>
            )}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              className="space-y-2.5"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={EASE}
            >
              {mode === 'zoom' ? (
                <>
                  <PositionPad state={state} update={update} background={background} {...preview} />
                  <BarSlider label="Zoom" value={state.zoom} min={20} max={150} suffix="%" onChange={(zoom) => update({ zoom })} />
                </>
              ) : (
                <>
                  <TiltPad state={state} update={update} background={background} {...preview} />
                  <BarSlider label="Rotation" value={state.rotateZ} min={-45} max={45} suffix="°" onChange={(rotateZ) => update({ rotateZ })} />
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Layout presets */}
        <div>
          <SectionLabel>Layout presets</SectionLabel>
          {/* Keyed by device count: switching 1/2/3 cascades the new set in */}
          <motion.div key={state.count} className="space-y-2" variants={stagger} initial="hidden" animate="visible">
            {state.count === 1
              ? LAYOUTS.map((layout) => (
                  <LayoutThumb key={layout.id} layout={layout} state={state} background={background} onClick={() => onApplyLayout(layout)} {...preview} />
                ))
              : arrangementsFor(state.count).map((arrangement) => (
                  <ArrangementThumb
                    key={arrangement.id}
                    arrangement={arrangement}
                    state={state}
                    background={background}
                    onClick={() => update({ arrangementId: arrangement.id })}
                    {...preview}
                  />
                ))}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
