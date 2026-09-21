'use client'

/* eslint-disable @next/next/no-img-element */
// The watermark logo is an in-memory data URL; next/image adds nothing here.

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type CSSProperties } from 'react'
import {
  analysePalette,
  buildLightOverlay,
  buildShadow,
  buildShapes,
  buildTransform,
  buildVfxLayers,
  findDevice,
  findShadowScene,
  fitMockupWidth,
  mockupAspect,
  resolveBackground,
  resolveSlots,
  watermarkPlacement,
  type BackgroundContext,
  type MockupState,
  type StyleId,
} from '@/lib/mockup'
import { DeviceFrame } from './DeviceFrame'
import { SHAPE_COLORS, ShapeView } from './Shapes'

/** The screenshot shown by one device of the composition. */
export type SlotMedia = {
  image: string | null
  /** Width / height of the screenshot, once it has loaded. */
  aspect: number | null
}

type Props = {
  state: MockupState
  /** One entry per visible device, in slot order. */
  slots: SlotMedia[]
  /** Dominant colours of the main screenshot, most common first. */
  palette: string[]
  background: BackgroundContext
  /** Called when a file is dropped straight onto one of the devices. */
  onDropSlot?: (slot: number, file: File) => void
}

// SVG turbulence tile used as film grain. Inline, so the export needs no fetch.
const NOISE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")"

/**
 * Decorative shell around the mockup. Flat rgba on purpose: foreignObject —
 * how html-to-image serialises the DOM — drops backdrop-filter, so a real
 * frosted blur would silently vanish from the exported file.
 *
 * @param u Size of one canvas pixel in on-screen pixels.
 */
function shellStyle(styleId: StyleId, radius: number, u: number): CSSProperties {
  const shell = (padding: number, rest: CSSProperties): CSSProperties => ({
    padding: padding * u,
    borderRadius: (radius + padding) * u,
    ...rest,
  })

  switch (styleId) {
    case 'glass-light':
      return shell(18, { background: 'rgba(255, 255, 255, 0.25)', border: `${1.5 * u}px solid rgba(255, 255, 255, 0.5)` })
    case 'glass-dark':
      return shell(18, { background: 'rgba(0, 0, 0, 0.3)', border: `${1.5 * u}px solid rgba(255, 255, 255, 0.14)` })
    case 'liquid':
      return shell(14, {
        background: 'repeating-linear-gradient(135deg, #fde047 0 6%, #fb923c 6% 12%, #f43f5e 12% 16%, #facc15 16% 22%)',
        boxShadow: `inset 0 0 0 ${2 * u}px rgba(255, 255, 255, 0.55)`,
      })
    case 'inset-light':
      return shell(16, { background: 'rgba(255, 255, 255, 0.55)', boxShadow: `inset 0 ${2 * u}px ${10 * u}px rgba(0, 0, 0, 0.25)` })
    case 'inset-dark':
      return shell(16, { background: 'rgba(0, 0, 0, 0.45)', boxShadow: `inset 0 ${2 * u}px ${12 * u}px rgba(0, 0, 0, 0.6)` })
    case 'outline':
      return shell(8, { border: `${1.5 * u}px solid rgba(255, 255, 255, 0.6)` })
    case 'border':
      return shell(12, { background: '#ffffff' })
    case 'retro':
      // Neo-brutalist: heavy outline plus a hard, unblurred offset shadow.
      return shell(0, { border: `${4 * u}px solid #0a0a0a`, boxShadow: `${12 * u}px ${12 * u}px 0 #0a0a0a` })
    case 'card':
      return shell(22, { background: '#ffffff', border: `${1 * u}px solid rgba(0, 0, 0, 0.06)` })
    case 'stack':
      // Cards stacked behind are box-shadows with a negative spread: they
      // follow the border radius for free and add no nodes to the export.
      return shell(0, {
        boxShadow: `0 ${14 * u}px 0 ${-7 * u}px rgba(255, 255, 255, 0.75), 0 ${28 * u}px 0 ${-14 * u}px rgba(255, 255, 255, 0.45)`,
      })
    case 'stack-2':
      return shell(0, {
        boxShadow: `${14 * u}px ${-14 * u}px 0 ${-5 * u}px rgba(255, 255, 255, 0.75), ${28 * u}px ${-28 * u}px 0 ${-10 * u}px rgba(255, 255, 255, 0.45)`,
      })
    default:
      return {}
  }
}

/** Visual treatment of the watermark for each style and theme. */
function watermarkStyle(state: MockupState, u: number): CSSProperties {
  const dark = state.watermarkTheme === 'dark'
  const ink = dark ? '#0a0a0a' : '#ffffff'
  const scale = state.watermarkSize / 80
  const base: CSSProperties = { color: ink, fontSize: 30 * u * scale, lineHeight: 1, letterSpacing: '0.02em' }

  switch (state.watermarkStyle) {
    case 'shadow':
      return { ...base, textShadow: `0 ${2 * u}px ${10 * u}px rgba(0, 0, 0, ${dark ? 0.15 : 0.55})` }
    case 'glass':
      return {
        ...base,
        padding: `${10 * u * scale}px ${16 * u * scale}px`,
        borderRadius: 999,
        background: dark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.28)',
        border: `${1 * u}px solid ${dark ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.3)'}`,
      }
    case 'badge':
      return {
        ...base,
        color: dark ? '#ffffff' : '#0a0a0a',
        padding: `${10 * u * scale}px ${18 * u * scale}px`,
        borderRadius: 999,
        background: dark ? '#0a0a0a' : '#ffffff',
        boxShadow: `0 ${4 * u}px ${14 * u}px rgba(0, 0, 0, 0.25)`,
      }
    default:
      return { ...base, opacity: 0.85 }
  }
}

export const MockupCanvas = forwardRef<HTMLDivElement, Props>(function MockupCanvas(
  { state, slots, palette, background, onDropSlot },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null)
  useImperativeHandle(ref, () => rootRef.current as HTMLDivElement)

  // One canvas pixel in on-screen pixels. Every length authored in canvas
  // pixels is multiplied by it, and the export then scales by the inverse — so
  // the file looks the same whatever the size of the preview.
  const [unit, setUnit] = useState(0.4)
  useEffect(() => {
    const node = rootRef.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => setUnit(entry.contentRect.width / state.width))
    observer.observe(node)
    return () => observer.disconnect()
  }, [state.width])

  const device = findDevice(state.deviceId)
  const variant = device.variants.find((v) => v.id === state.variantId) ?? device.variants[0]
  // Styles wrap the flat, media-shaped devices; physical devices keep their body.
  const adaptive = device.kind === 'screenshot' || device.kind === 'browser'
  const styled = adaptive && state.styleId !== 'default'
  const shadow = buildShadow(state.shadowMode, state.shadowOpacity, palette[0] ?? null, unit * 2)
  const light = buildLightOverlay(state.lightAngle, state.lightIntensity)
  const shell = styled ? shellStyle(state.styleId, state.radius, unit) : null
  const placements = resolveSlots(state.count, state.arrangementId)

  const backgroundBlur = (state.portraitMode === 'lens' ? state.portraitBlur : 0) + state.bgBlur
  const shadowScene = state.sceneId === 'shadow' ? findShadowScene(state.sceneShadowId) : null
  const brand = analysePalette(palette).brand
  const shapeColors: [string, string] = brand.length ? [brand[0], brand[1] ?? SHAPE_COLORS[1]] : SHAPE_COLORS

  const renderMockup = (media: SlotMedia) => {
    const frame = (
      <DeviceFrame
        device={device}
        variant={variant}
        image={media.image}
        radius={state.radius * unit}
        // With a shell, the shadow belongs to the shell's outline instead.
        shadow={styled ? 'none' : shadow}
        light={light}
      />
    )
    if (!shell) return frame
    return (
      <div style={{ ...shell, boxShadow: [shell.boxShadow, shadow].filter((v) => v && v !== 'none').join(', ') || undefined }}>
        {frame}
      </div>
    )
  }

  const shadowLayer = shadowScene && (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: shadowScene.css,
        filter: `blur(${shadowScene.blur * unit * 2}px)`,
        mixBlendMode: 'multiply',
        opacity: Math.min(1, state.sceneOpacity / 50),
        transform: shadowScene.transform ?? 'scale(1.15)',
      }}
    />
  )

  return (
    <div
      ref={rootRef}
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: `${state.width} / ${state.height}` }}
    >
      {/* Background — blurred and slightly enlarged when blurred, so the soft
          edge never reveals the canvas behind it */}
      <div
        className="absolute inset-0"
        style={{
          background: resolveBackground(state.backgroundId, background),
          filter: backgroundBlur > 0 ? `blur(${backgroundBlur * unit}px)` : undefined,
          transform: backgroundBlur > 0 ? 'scale(1.08)' : undefined,
        }}
      />

      {state.portraitMode === 'stage' && (
        // Stage: a spotlight falls on the mockup while the edges sink into shade.
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 55% 60% at 50% 46%, rgba(0, 0, 0, 0) 35%, rgba(0, 0, 0, ${0.35 + state.portraitBlur / 120}) 100%)`,
          }}
        />
      )}

      {state.sceneId === 'shapes' && (
        <div className="absolute inset-0 pointer-events-none">
          {buildShapes({ composition: state.shapesComposition, kind: state.shapesKind, seed: state.shapesSeed }).map((item, i) => (
            <ShapeView key={i} item={item} colors={shapeColors} />
          ))}
        </div>
      )}

      {state.sceneLayer === 'underlay' && shadowLayer}

      {!state.hideMockup && (
        // The whole composition moves together; offsets are % of the canvas.
        <div className="absolute inset-0 pointer-events-none" style={{ transform: `translate(${state.offsetX}%, ${state.offsetY}%)` }}>
          {placements.map((placement, index) => {
            const media = slots[index] ?? { image: null, aspect: null }
            const width =
              fitMockupWidth({
                canvasAspect: state.width / state.height,
                mockupAspect: mockupAspect(device, media.aspect),
                zoom: state.zoom,
              }) * placement.scale

            return (
              <div
                key={index}
                className="absolute inset-0 flex items-center justify-center"
                style={{ transform: `translate(${placement.x}%, ${placement.y}%)`, zIndex: placement.z ?? index }}
              >
                <div
                  // Only the device itself catches pointer and drop events, so
                  // overlapping slots never steal each other's drops. data-slot
                  // lets the editor tell which device a click landed on.
                  data-slot={index}
                  className={onDropSlot && !media.image ? 'pointer-events-auto cursor-pointer' : 'pointer-events-auto'}
                  title={onDropSlot && !media.image ? 'Clic para elegir una captura' : undefined}
                  style={{ width: `${width}%` }}
                  onDragOver={onDropSlot ? (e) => e.preventDefault() : undefined}
                  onDrop={
                    onDropSlot
                      ? (e) => {
                          const file = e.dataTransfer.files[0]
                          if (!file) return
                          e.preventDefault()
                          e.stopPropagation()
                          onDropSlot(index, file)
                        }
                      : undefined
                  }
                >
                  <div
                    style={{
                      transform: buildTransform({
                        rotateX: state.rotateX + placement.rotateX,
                        rotateY: state.rotateY + placement.rotateY,
                        rotateZ: state.rotateZ + placement.rotateZ,
                        perspective: state.perspective,
                      }),
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    {renderMockup(media)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {state.sceneLayer === 'overlay' && shadowLayer}

      {state.noise > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: NOISE, backgroundSize: `${160 * unit * 2}px`, opacity: (state.noise / 100) * 0.6, mixBlendMode: 'overlay' }}
        />
      )}

      {state.vignette > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at center, rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, ${(state.vignette / 100) * 0.75}) 100%)` }}
        />
      )}

      {buildVfxLayers(state.vfx, state.vfxIntensity).map((layer, i) => (
        <div
          key={i}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: layer.background,
            backgroundSize: layer.backgroundSize,
            opacity: layer.opacity,
            mixBlendMode: layer.mixBlendMode as CSSProperties['mixBlendMode'],
          }}
        />
      ))}

      {state.watermarkEnabled && (state.watermarkImage || state.watermarkText.trim()) && (
        <div
          className="absolute pointer-events-none font-[var(--font-fira-code)] whitespace-nowrap"
          style={{ ...watermarkPlacement(state.watermarkPosition, state.watermarkInset), ...watermarkStyle(state, unit) }}
        >
          {state.watermarkImage ? (
            <img
              src={state.watermarkImage}
              alt=""
              style={{ height: 44 * unit * (state.watermarkSize / 80), width: 'auto', display: 'block' }}
            />
          ) : (
            state.watermarkText
          )}
        </div>
      )}
    </div>
  )
})
