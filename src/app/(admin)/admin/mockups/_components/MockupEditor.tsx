'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { toCanvas } from 'html-to-image'
import { toast } from '@/lib/toast'
import {
  DEFAULT_MOCKUP_STATE,
  EXPORT_FORMATS,
  applyDrag,
  applyLayout,
  applyLook,
  applyTemplate,
  buildMagicBackgrounds,
  buildMagicLooks,
  canRedo,
  canUndo,
  commit,
  createHistory,
  exportFileName,
  extractPalette,
  isTap,
  redo,
  resolveBackground,
  resolveOutputSize,
  resolvePixelRatio,
  setDeviceCount,
  undo,
  type BackgroundContext,
  type DeviceCount,
  type DragMode,
  type History,
  type MockupState,
} from '@/lib/mockup'
import { FramePanel } from './FramePanel'
import { MockupCanvas, type SlotMedia } from './MockupCanvas'
import { MockupPanel } from './MockupPanel'
import { SidePanel } from './SidePanel'
import { TemplatesPanel } from './TemplatesPanel'
import { StartOverDialog, Toolbar } from './Toolbar'
import { Segmented } from './ui'
import { EASE } from './motion'

/** Side of the square the screenshot is shrunk to before sampling colours. */
const PALETTE_SAMPLE = 64
const PALETTE_SIZE = 5
const MAX_SLOTS = 3
/** Changes closer together than this fold into a single undo step. */
const COALESCE_MS = 500

/**
 * Vertical space above and below the editor inside the admin shell: the main
 * padding plus the breadcrumb and page label. The three columns share the rest,
 * which is what gives them the same height.
 */
const EDITOR_OFFSET = '10.5rem'

type Slot = SlotMedia & { palette: string[] }

const EMPTY_SLOT: Slot = { image: null, aspect: null, palette: [] }
const emptySlots = () => Array.from({ length: MAX_SLOTS }, () => EMPTY_SLOT)

// A 10×10 grid with a slightly stronger centre cross, drawn while dragging.
const DRAG_GRID =
  'linear-gradient(to right, rgba(255, 255, 255, 0.45) 1px, transparent 1px) 50% 0 / 100% 100% no-repeat, ' +
  'linear-gradient(to bottom, rgba(255, 255, 255, 0.45) 1px, transparent 1px) 0 50% / 100% 100% no-repeat, ' +
  'linear-gradient(to right, rgba(255, 255, 255, 0.18) 1px, transparent 1px) 0 0 / 10% 100%, ' +
  'linear-gradient(to bottom, rgba(255, 255, 255, 0.18) 1px, transparent 1px) 0 0 / 100% 10%'

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    // A data URL keeps the bytes inline, which is what lets html-to-image
    // serialise the canvas without tripping over cross-origin restrictions.
    reader.readAsDataURL(file)
  })
}

/**
 * Measures the screenshot and samples its dominant colours. A 64×64 thumbnail
 * is plenty for a palette and keeps this instant even for 4K captures.
 */
function analyseImage(src: string): Promise<{ aspect: number; palette: string[] }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const aspect = img.naturalWidth / img.naturalHeight
      const canvas = document.createElement('canvas')
      canvas.width = PALETTE_SAMPLE
      canvas.height = PALETTE_SAMPLE
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) {
        resolve({ aspect, palette: [] })
        return
      }
      context.drawImage(img, 0, 0, PALETTE_SAMPLE, PALETTE_SAMPLE)
      const { data } = context.getImageData(0, 0, PALETTE_SAMPLE, PALETTE_SAMPLE)
      resolve({ aspect, palette: extractPalette(data, PALETTE_SIZE) })
    }
    img.onerror = () => reject(new Error('image failed to load'))
    img.src = src
  })
}

/** True when the key event comes from a field that should keep its own keys. */
function isTyping(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null
  if (!target) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

type Gesture = {
  x: number
  y: number
  start: Pick<MockupState, 'offsetX' | 'offsetY' | 'rotateX' | 'rotateY'>
  size: { width: number; height: number }
  /** Becomes true once the pointer travels past the tap tolerance. */
  moved: boolean
}

export function MockupEditor() {
  // The editor state lives inside an undo history; `state` is its present.
  const [history, setHistory] = useState<History<MockupState>>(() => createHistory(DEFAULT_MOCKUP_STATE))
  const state = history.present
  const lastChange = useRef(0)

  const [tab, setTab] = useState<'mockup' | 'frame'>('mockup')
  const [mode, setMode] = useState<DragMode>('zoom')
  // The index is stored with the palette it was chosen for: a new screenshot
  // brings new looks, and a stale index simply stops matching — no effect and
  // no intermediate render pointing an old index at the new list.
  const [lookChoice, setLookChoice] = useState<{ palette: string[]; index: number } | null>(null)
  const [paletteEdit, setPaletteEdit] = useState<{ base: string[]; colors: string[] } | null>(null)
  // When on, every new screenshot or palette edit applies the best-contrast
  // Magic background automatically.
  const [magicAuto, setMagicAuto] = useState(false)
  const [slots, setSlots] = useState<Slot[]>(emptySlots)
  const [activeSlot, setActiveSlot] = useState(0)
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [gestureActive, setGestureActive] = useState(false)
  const [confirmStartOver, setConfirmStartOver] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const screenshotInputRef = useRef<HTMLInputElement>(null)
  /** Device slot the canvas file picker will fill. */
  const pickTarget = useRef(0)
  // Latest slots for async loaders, which would otherwise close over stale ones.
  const slotsRef = useRef(slots)
  useEffect(() => {
    slotsRef.current = slots
  }, [slots])

  /**
   * Drop-in replacement for a useState setter that records undo steps. Whether
   * a change folds into the previous step is decided here, outside the updater,
   * so the updater itself stays pure.
   */
  const setState = useCallback((action: SetStateAction<MockupState>) => {
    const now = performance.now()
    const coalesce = now - lastChange.current < COALESCE_MS
    lastChange.current = now
    setHistory((h) => commit(h, typeof action === 'function' ? action(h.present) : action, { coalesce }))
  }, [])

  // A patch that changes nothing returns the same object, which the history
  // ignores — so a click or a still pointer never leaves an empty undo step.
  const update = useCallback(
    (patch: Partial<MockupState>) =>
      setState((s) =>
        (Object.keys(patch) as (keyof MockupState)[]).every((key) => Object.is(s[key], patch[key])) ? s : { ...s, ...patch },
      ),
    [setState],
  )

  const handleUndo = useCallback(() => {
    lastChange.current = 0
    setHistory(undo)
  }, [])
  const handleRedo = useCallback(() => {
    lastChange.current = 0
    setHistory(redo)
  }, [])

  const visibleSlots = slots.slice(0, state.count)
  // Magic backgrounds and the adaptive shadow follow the first screenshot in.
  // Memoised because `?? []` would otherwise hand the memos below a brand new
  // array on every render and recompute them each time.
  const extractedPalette = useMemo(
    () => slots.slice(0, state.count).find((s) => s.image)?.palette ?? [],
    [slots, state.count],
  )
  // Hand-edited colours only apply to the palette they were edited from: a new
  // screenshot is read afresh instead of inheriting the previous tweaks.
  const palette = paletteEdit && paletteEdit.base === extractedPalette ? paletteEdit.colors : extractedPalette
  const paletteCustomized = palette !== extractedPalette
  const magic = useMemo(() => buildMagicBackgrounds(palette), [palette])
  const looks = useMemo(() => buildMagicLooks(palette), [palette])
  const lookIndex = lookChoice && lookChoice.palette === palette ? lookChoice.index : null
  const backgroundContext: BackgroundContext = useMemo(
    () => ({ customColor: state.customColor, imageUrl: backgroundImage, magic }),
    [state.customColor, backgroundImage, magic],
  )
  const leadSlot = visibleSlots.find((s) => s.image) ?? null
  const hasImage = leadSlot !== null

  /** Switches to the Magic background that best contrasts with `colors`. */
  const applyMagicBackground = useCallback(
    (colors: string[]) => {
      const best = buildMagicLooks(colors)[0]
      if (best?.patch.backgroundId) update({ backgroundId: best.patch.backgroundId })
    },
    [update],
  )

  const changePalette = (colors: string[]) => {
    setPaletteEdit({ base: extractedPalette, colors })
    if (magicAuto) applyMagicBackground(colors)
  }

  const loadScreenshot = useCallback(
    async (file: File, slot?: number) => {
      if (!file.type.startsWith('image/')) {
        toast.error('Ese archivo no es una imagen.')
        return
      }
      const target = slot ?? activeSlot
      try {
        const image = await readAsDataUrl(file)
        const { aspect, palette } = await analyseImage(image)
        // Computed outside the state updater: updaters must stay pure, and
        // Strict Mode runs them twice precisely to catch side effects in them.
        const next = slotsRef.current.map((s, i) => (i === target ? { image, aspect, palette } : s))
        setSlots(next)
        // Hand the next paste to the following empty device, so filling a
        // multi-device composition is just paste, paste, paste.
        const empty = next.findIndex((s, i) => i < state.count && i !== target && !s.image)
        if (empty !== -1) setActiveSlot(empty)
        if (magicAuto) {
          const lead = next.slice(0, state.count).find((s) => s.image)?.palette ?? []
          applyMagicBackground(lead)
        }
      } catch {
        toast.error('No se pudo leer la imagen.')
      }
    },
    [activeSlot, state.count, magicAuto, applyMagicBackground],
  )

  const loadBackground = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast.error('Ese archivo no es una imagen.')
        return
      }
      try {
        setBackgroundImage(await readAsDataUrl(file))
        update({ backgroundId: 'image' })
      } catch {
        toast.error('No se pudo leer la imagen de fondo.')
      }
    },
    [update],
  )

  // Pasting straight from the clipboard is how a screenshot usually arrives.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const file = Array.from(event.clipboardData?.files ?? []).find((f) => f.type.startsWith('image/'))
      if (file) loadScreenshot(file)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [loadScreenshot])

  const changeCount = (count: DeviceCount) => {
    setState((s) => setDeviceCount(s, count))
    if (activeSlot >= count) setActiveSlot(0)
  }

  const cycleLook = (direction: 1 | -1) => {
    if (looks.length === 0) return
    // From "none applied yet", forward starts at the first look, back at the last.
    const next =
      lookIndex === null
        ? direction === 1
          ? 0
          : looks.length - 1
        : (lookIndex + direction + looks.length) % looks.length
    setLookChoice({ palette, index: next })
    setState((s) => applyLook(s, looks[next]))
  }

  /** Renders the canvas at the exact output resolution chosen in the menu. */
  const renderOutput = useCallback(async (): Promise<HTMLCanvasElement> => {
    const node = canvasRef.current
    if (!node) throw new Error('canvas not mounted')
    const output = resolveOutputSize(state.width, state.height, state.exportScale)
    // The ratio comes from the live node width, so the file lands on the exact
    // resolution whatever the preview size is. No backgroundColor is passed:
    // the canvas paints its own, and a library fill would flatten transparency.
    return toCanvas(node, { pixelRatio: resolvePixelRatio(node.offsetWidth, output.width), cacheBust: true })
  }, [state.width, state.height, state.exportScale])

  /** Resolves true when the file was downloaded, so the button can celebrate. */
  const handleExport = useCallback(async (): Promise<boolean> => {
    if (!hasImage) {
      toast.error('Subí una captura antes de exportar.')
      return false
    }
    if (state.exportFormat === 'jpeg' && state.backgroundId === 'transparent') {
      toast.error('JPEG no admite transparencia. Elegí PNG o WebP.')
      return false
    }
    setExporting(true)
    try {
      const canvas = await renderOutput()
      const format = EXPORT_FORMATS.find((f) => f.id === state.exportFormat)!
      const link = document.createElement('a')
      link.href = canvas.toDataURL(format.mime, 0.95)
      link.download = exportFileName(new Date(), state.exportFormat)
      link.click()
      toast.success('Mockup descargado.')
      return true
    } catch {
      toast.error('No se pudo generar la imagen.')
      return false
    } finally {
      setExporting(false)
    }
  }, [hasImage, renderOutput, state.exportFormat, state.backgroundId])

  const handleCopy = useCallback(async (): Promise<boolean> => {
    if (!hasImage) {
      toast.error('Subí una captura antes de copiar.')
      return false
    }
    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
      toast.error('Tu navegador no permite copiar imágenes.')
      return false
    }
    setExporting(true)
    try {
      // The item receives the *promise* of the PNG, not the PNG: writing starts
      // inside the click, which is what the browser requires. Awaiting the
      // render first would let the user gesture expire and the write be refused.
      const blob = renderOutput().then(
        (canvas) =>
          new Promise<Blob>((resolve, reject) =>
            canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('empty blob'))), 'image/png'),
          ),
      )
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      // The clipboard only carries PNG, whatever format is picked for downloads.
      toast.success('Imagen copiada al portapapeles (PNG).')
      return true
    } catch {
      toast.error('No se pudo copiar la imagen.')
      return false
    } finally {
      setExporting(false)
    }
  }, [hasImage, renderOutput])

  const startOver = () => {
    lastChange.current = 0
    setHistory(createHistory(DEFAULT_MOCKUP_STATE))
    setSlots(emptySlots())
    setActiveSlot(0)
    setBackgroundImage(null)
    setPaletteEdit(null)
    setLookChoice(null)
    setMagicAuto(false)
    setConfirmStartOver(false)
  }

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen()
    else stageRef.current?.requestFullscreen()
  }, [])

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === stageRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // Keyboard shortcuts — the same list the ⌘ panel shows.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event)) return
      const mod = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()

      if (mod && key === 'z') {
        event.preventDefault()
        if (event.shiftKey) handleRedo()
        else handleUndo()
      } else if (mod && key === 'y') {
        event.preventDefault()
        handleRedo()
      } else if (mod && key === 'e') {
        event.preventDefault()
        handleExport()
      } else if (mod && event.shiftKey && key === 'c') {
        event.preventDefault()
        handleCopy()
      } else if (!mod && !event.altKey && key === 'f') {
        event.preventDefault()
        toggleFullscreen()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleUndo, handleRedo, handleExport, handleCopy, toggleFullscreen])

  const endGesture = () => {
    gesture.current = null
    setGestureActive(false)
  }

  /**
   * A click (not a drag) on the canvas. Clicking an empty device opens the file
   * picker for that device; clicking a filled one just selects it as the target
   * of the next paste, so dragging a finished mockup never pops a dialog.
   */
  const handleCanvasTap = (clientX: number, clientY: number) => {
    // Pointer capture retargets pointerup to the canvas wrapper, so the device
    // under the pointer is looked up by position instead of from the event.
    const device = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>('[data-slot]')
    if (!device) return
    const slot = Number(device.dataset.slot)
    setActiveSlot(slot)
    if (!visibleSlots[slot]?.image) {
      pickTarget.current = slot
      screenshotInputRef.current?.click()
    }
  }

  // In fullscreen the stage owns the whole screen, so the canvas can grow.
  const canvasWidth = fullscreen
    ? `min(92vw, calc(84vh * ${state.width / state.height}))`
    : `min(88%, calc((100vh - ${EDITOR_OFFSET} - 9rem) * ${state.width / state.height}))`

  return (
    // reducedMotion="user" honours the OS "reduce motion" setting: every
    // animation below degrades to a plain fade instead of moving.
    <MotionConfig reducedMotion="user">
    <div
      className="grid grid-cols-[320px_minmax(0,1fr)_300px] gap-6"
      style={{ height: `calc(100vh - ${EDITOR_OFFSET})` }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault()
          setDragging(true)
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) loadScreenshot(file)
      }}
    >
      {/* Left panel */}
      <aside className="h-full min-h-0 overflow-y-auto scrollbar-neon rounded-2xl bg-[#0d0d0d] border border-[#1a1a1a] pb-2">
        <div className="sticky top-0 z-20 bg-[#0d0d0d] p-3 pb-0">
          <TemplatesPanel
            state={state}
            slots={slots}
            palette={palette}
            background={backgroundContext}
            onApply={(template) => setState((s) => applyTemplate(s, template))}
          />
          <Segmented
            options={[
              { id: 'mockup', label: 'Mockup' },
              { id: 'frame', label: 'Frame' },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>
        {/* Each tab slides in from the side its tab sits on */}
        <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, x: tab === 'mockup' ? -14 : 14 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: tab === 'mockup' ? -14 : 14 }}
          transition={EASE}
        >
        {tab === 'mockup' ? (
          <MockupPanel
            state={state}
            update={update}
            slots={visibleSlots}
            activeSlot={activeSlot}
            onSelectSlot={setActiveSlot}
            onPickImage={(file) => loadScreenshot(file)}
            onClearImage={(slot) => setSlots((current) => current.map((s, i) => (i === slot ? EMPTY_SLOT : s)))}
            looks={looks}
            magic={magic}
            lookIndex={lookIndex}
            onCycleLook={cycleLook}
            previewImage={leadSlot?.image ?? null}
          />
        ) : (
          <FramePanel
            state={state}
            update={update}
            magic={magic}
            palette={palette}
            paletteCustomized={paletteCustomized}
            onPaletteChange={changePalette}
            onPaletteReset={() => {
              setPaletteEdit(null)
              if (magicAuto) applyMagicBackground(extractedPalette)
            }}
            magicAuto={magicAuto}
            onMagicAutoChange={(on) => {
              setMagicAuto(on)
              if (on) applyMagicBackground(palette)
            }}
            hasImage={hasImage}
            backgroundImage={backgroundImage}
            onPickBackground={loadBackground}
          />
        )}
        </motion.div>
        </AnimatePresence>
      </aside>

      {/* Stage — toolbar plus canvas, in a panel as tall as the side columns */}
      <div
        ref={stageRef}
        className={
          fullscreen
            ? 'bg-[#0a0a0a] flex flex-col items-center justify-center gap-4'
            : 'h-full min-h-0 rounded-2xl bg-[#0d0d0d] border border-[#1a1a1a] flex flex-col overflow-hidden'
        }
      >
        <div className={fullscreen ? '' : 'shrink-0 pt-3'}>
          <Toolbar
            canUndo={canUndo(history)}
            canRedo={canRedo(history)}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onStartOver={() => setConfirmStartOver(true)}
            fullscreen={fullscreen}
            onToggleFullscreen={toggleFullscreen}
          />
        </div>

        <div className={fullscreen ? 'flex items-center justify-center' : 'flex-1 min-h-0 flex items-center justify-center'}>
          <div
            className={
              dragging
                ? 'rounded-2xl p-1.5 border-2 border-dashed border-[#22d3ee] transition-colors'
                : 'rounded-2xl p-1.5 border-2 border-dashed border-transparent transition-colors'
            }
            style={{ width: canvasWidth }}
          >
            <div
              className={`relative rounded-xl overflow-hidden touch-none select-none ${mode === 'zoom' ? 'cursor-move' : 'cursor-grab active:cursor-grabbing'}`}
              style={{ background: 'repeating-conic-gradient(#161616 0% 25%, #111 0% 50%) 50% / 20px 20px' }}
              // Dragging on the canvas moves the composition in Zoom mode and
              // tilts it in Tilt mode, like the pads in the right panel; Shift
              // slows it down for fine adjustments.
              onPointerDown={(e) => {
                if (e.button !== 0 || !canvasRef.current) return
                const rect = canvasRef.current.getBoundingClientRect()
                gesture.current = {
                  x: e.clientX,
                  y: e.clientY,
                  start: { offsetX: state.offsetX, offsetY: state.offsetY, rotateX: state.rotateX, rotateY: state.rotateY },
                  size: { width: rect.width, height: rect.height },
                  moved: false,
                }
                e.currentTarget.setPointerCapture(e.pointerId)
              }}
              onPointerMove={(e) => {
                const g = gesture.current
                if (!g) return
                const dx = e.clientX - g.x
                const dy = e.clientY - g.y
                // Nothing moves until the press is clearly a drag, so a click
                // never nudges the mockup by a pixel.
                if (!g.moved) {
                  if (isTap(dx, dy)) return
                  g.moved = true
                  setGestureActive(true)
                }
                update(applyDrag(mode, g.start, dx, dy, g.size, { precision: e.shiftKey }))
              }}
              onPointerUp={(e) => {
                const g = gesture.current
                endGesture()
                if (g && !g.moved) handleCanvasTap(e.clientX, e.clientY)
              }}
              onPointerCancel={endGesture}
              onDoubleClick={() => update(mode === 'zoom' ? { offsetX: 0, offsetY: 0 } : { rotateX: 0, rotateY: 0 })}
            >
              <MockupCanvas
                ref={canvasRef}
                state={state}
                slots={visibleSlots}
                palette={palette}
                background={backgroundContext}
                onDropSlot={(slot, file) => {
                  setDragging(false)
                  loadScreenshot(file, slot)
                }}
              />
              {/* A sibling of the canvas, never a child: html-to-image only
                  serialises the canvas node, so the grid can't reach the file */}
              <AnimatePresence>
                {gestureActive && (
                  <motion.div
                    key="grid"
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: DRAG_GRID }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={EASE}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <aside className="h-full min-h-0 rounded-2xl bg-[#0d0d0d] border border-[#1a1a1a]">
        <SidePanel
          state={state}
          update={update}
          background={resolveBackground(state.backgroundId, backgroundContext)}
          mode={mode}
          onModeChange={setMode}
          onCountChange={changeCount}
          exporting={exporting}
          canExport={hasImage}
          onExport={handleExport}
          onCopy={handleCopy}
          onApplyLayout={(layout) => setState((s) => applyLayout(s, layout))}
          slotImages={visibleSlots.map((s) => s.image)}
          previewAspect={leadSlot?.aspect ?? null}
        />
      </aside>

      {/* File picker opened by clicking an empty device on the canvas */}
      <input
        ref={screenshotInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) loadScreenshot(file, pickTarget.current)
          e.target.value = ''
        }}
      />

      <AnimatePresence>
        {confirmStartOver && <StartOverDialog onCancel={() => setConfirmStartOver(false)} onConfirm={startOver} />}
      </AnimatePresence>
    </div>
    </MotionConfig>
  )
}
