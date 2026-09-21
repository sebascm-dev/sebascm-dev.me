import type { BorderId, ExportFormat, SceneId, ShadowMode, StyleId } from './catalog'
import type { ShapeKind, VfxId, WatermarkPosition, WatermarkStyle } from './effects'

export type DeviceCount = 1 | 2 | 3

export type MockupState = {
  // Mockup tab
  deviceId: string
  variantId: string
  styleId: StyleId
  borderId: BorderId
  radius: number
  shadowMode: ShadowMode
  shadowOpacity: number
  lightAngle: number
  /** 0 disables the light reflection. */
  lightIntensity: number
  hideMockup: boolean
  // Frame tab
  sizeId: string
  width: number
  height: number
  /** A catalogue preset id, or one of: transparent, color, image, magic-N. */
  backgroundId: string
  customColor: string
  /** Portrait: lens blur softens the background, stage spotlights the mockup. */
  portraitMode: 'none' | 'lens' | 'stage'
  /** Strength of the portrait effect, in canvas pixels of blur. */
  portraitBlur: number
  watermarkEnabled: boolean
  watermarkText: string
  /** Data URL of a logo used instead of the text, if any. */
  watermarkImage: string | null
  watermarkStyle: WatermarkStyle
  watermarkTheme: 'light' | 'dark'
  watermarkPosition: WatermarkPosition
  /** Relative size, 100 = the default size. */
  watermarkSize: number
  /** Distance from the edges, in % of the canvas. */
  watermarkInset: number
  noise: number
  /** Background-only blur from the Bg Effects panel, in canvas pixels. */
  bgBlur: number
  vignette: number
  vfx: VfxId
  vfxIntensity: number
  sceneId: SceneId
  sceneShadowId: string
  sceneOpacity: number
  /** Underlay darkens only the background; overlay falls over the mockup too. */
  sceneLayer: 'underlay' | 'overlay'
  shapesComposition: number
  shapesKind: ShapeKind | null
  shapesSeed: number | null
  // Right panel
  /** How many devices share the canvas. */
  count: DeviceCount
  /** Arrangement used when count > 1. */
  arrangementId: string
  zoom: number
  offsetX: number
  offsetY: number
  rotateX: number
  rotateY: number
  rotateZ: number
  perspective: number
  exportScale: 1 | 2 | 3
  exportFormat: ExportFormat
}

export const DEFAULT_MOCKUP_STATE: MockupState = {
  deviceId: 'screenshot',
  variantId: 'default',
  styleId: 'default',
  borderId: 'curved',
  radius: 20,
  shadowMode: 'spread',
  shadowOpacity: 40,
  lightAngle: 135,
  lightIntensity: 0,
  hideMockup: false,
  sizeId: '4:3',
  width: 1920,
  height: 1440,
  backgroundId: 'gradient-sunset',
  customColor: '#22d3ee',
  portraitMode: 'none',
  portraitBlur: 24,
  watermarkEnabled: false,
  watermarkText: 'sebascm.dev',
  watermarkImage: null,
  watermarkStyle: 'default',
  watermarkTheme: 'light',
  watermarkPosition: 'br',
  watermarkSize: 80,
  watermarkInset: 4,
  noise: 0,
  bgBlur: 0,
  vignette: 0,
  vfx: 'none',
  vfxIntensity: 50,
  sceneId: 'none',
  sceneShadowId: 'blinds',
  sceneOpacity: 40,
  sceneLayer: 'overlay',
  shapesComposition: 0,
  shapesKind: null,
  shapesSeed: null,
  count: 1,
  arrangementId: '',
  zoom: 80,
  offsetX: 0,
  offsetY: 0,
  rotateX: 0,
  rotateY: 0,
  rotateZ: 0,
  perspective: 1400,
  exportScale: 1,
  exportFormat: 'png',
}

/** The parts of the state a Magic Preset is allowed to restyle. */
type LookPatch = Partial<
  Pick<
    MockupState,
    | 'styleId'
    | 'borderId'
    | 'radius'
    | 'shadowMode'
    | 'shadowOpacity'
    | 'lightIntensity'
    | 'lightAngle'
    | 'backgroundId'
    | 'sceneId'
    | 'noise'
    | 'vignette'
    | 'rotateX'
    | 'rotateY'
    | 'rotateZ'
    | 'zoom'
  >
>

/**
 * A complete one-click restyle. Magic Presets are generated from the
 * screenshot (see magic.ts); they never touch the canvas size, the device or
 * the export options.
 */
export type Look = { id: string; label: string; patch: LookPatch }

export type Layout = {
  id: string
  label: string
  zoom: number
  offsetX: number
  offsetY: number
  rotateX: number
  rotateY: number
  rotateZ: number
}

// Position and angle presets shown as thumbnails in the right panel.
export const LAYOUTS: Layout[] = [
  { id: 'center', label: 'Centrado', zoom: 80, offsetX: 0, offsetY: 0, rotateX: 0, rotateY: 0, rotateZ: 0 },
  { id: 'tilt-right', label: 'Inclinado derecha', zoom: 78, offsetX: 0, offsetY: 0, rotateX: 10, rotateY: -18, rotateZ: 4 },
  { id: 'tilt-left', label: 'Inclinado izquierda', zoom: 78, offsetX: 0, offsetY: 0, rotateX: 10, rotateY: 18, rotateZ: -4 },
  { id: 'lean', label: 'Apoyado', zoom: 82, offsetX: 0, offsetY: 6, rotateX: 28, rotateY: 0, rotateZ: -6 },
  { id: 'rotated', label: 'Girado', zoom: 76, offsetX: 0, offsetY: 0, rotateX: 0, rotateY: 0, rotateZ: -8 },
  { id: 'bleed-bottom', label: 'Asomando abajo', zoom: 92, offsetX: 0, offsetY: 22, rotateX: 0, rotateY: 0, rotateZ: 0 },
  { id: 'bleed-right', label: 'Asomando derecha', zoom: 96, offsetX: 22, offsetY: 8, rotateX: 0, rotateY: -10, rotateZ: 0 },
  { id: 'hero', label: 'Hero', zoom: 110, offsetX: 0, offsetY: 18, rotateX: 22, rotateY: 0, rotateZ: 0 },
]

/**
 * Where one device sits inside a multi-device composition. x and y are offsets
 * from the centre in % of the canvas; scale multiplies the width a single
 * device would get; rotations add to the global tilt.
 */
export type SlotPlacement = {
  x: number
  y: number
  scale: number
  rotateX: number
  rotateY: number
  rotateZ: number
  /** Stacking order; defaults to the slot index (later slots on top). */
  z?: number
}

export type Arrangement = {
  id: string
  label: string
  count: Exclude<DeviceCount, 1>
  slots: SlotPlacement[]
}

const slot = (x: number, y: number, scale: number, rotateX = 0, rotateY = 0, rotateZ = 0, z?: number): SlotPlacement =>
  z === undefined ? { x, y, scale, rotateX, rotateY, rotateZ } : { x, y, scale, rotateX, rotateY, rotateZ, z }

export const ARRANGEMENTS: Arrangement[] = [
  { id: 'duo-row', label: 'Lado a lado', count: 2, slots: [slot(-24, 0, 0.46), slot(24, 0, 0.46)] },
  { id: 'duo-tilt', label: 'Enfrentados', count: 2, slots: [slot(-24, -2, 0.46, 8, 14, -3), slot(24, 2, 0.46, 8, -14, 3)] },
  { id: 'duo-overlap', label: 'Solapados', count: 2, slots: [slot(-12, -8, 0.56, 0, 0, -4), slot(12, 8, 0.56, 0, 0, 4)] },
  { id: 'duo-diagonal', label: 'Diagonal', count: 2, slots: [slot(-14, 10, 0.5, 20, 0, -18), slot(14, -10, 0.5, 20, 0, -18)] },
  { id: 'duo-stagger', label: 'Escalonados', count: 2, slots: [slot(-16, -12, 0.5), slot(16, 12, 0.5)] },
  { id: 'trio-row', label: 'En fila', count: 3, slots: [slot(-32, 0, 0.3), slot(0, 0, 0.3), slot(32, 0, 0.3)] },
  { id: 'trio-focus', label: 'Protagonista', count: 3, slots: [slot(-30, 6, 0.32, 0, 18, 0, 0), slot(0, 0, 0.44, 0, 0, 0, 2), slot(30, 6, 0.32, 0, -18, 0, 1)] },
  { id: 'trio-fan', label: 'Abanico', count: 3, slots: [slot(-26, 4, 0.36, 0, 0, -10), slot(0, -2, 0.38, 0, 0, 0, 2), slot(26, 4, 0.36, 0, 0, 10)] },
  { id: 'trio-stair', label: 'Escalera', count: 3, slots: [slot(-24, -14, 0.42), slot(0, 0, 0.42), slot(24, 14, 0.42)] },
  { id: 'trio-cascade', label: 'Cascada', count: 3, slots: [slot(-18, -12, 0.48, 0, 0, -6), slot(0, 0, 0.48, 0, 0, -6), slot(18, 12, 0.48, 0, 0, -6)] },
]

const SINGLE_SLOT: SlotPlacement = { x: 0, y: 0, scale: 1, rotateX: 0, rotateY: 0, rotateZ: 0 }

export function arrangementsFor(count: DeviceCount): Arrangement[] {
  return ARRANGEMENTS.filter((a) => a.count === count)
}

export function resolveSlots(count: DeviceCount, arrangementId: string): SlotPlacement[] {
  if (count === 1) return [SINGLE_SLOT]
  const options = arrangementsFor(count)
  return (options.find((a) => a.id === arrangementId) ?? options[0]).slots
}

export function setDeviceCount(state: MockupState, count: DeviceCount): MockupState {
  return { ...state, count, arrangementId: count === 1 ? '' : arrangementsFor(count)[0].id }
}

export function applyLook(state: MockupState, look: Look): MockupState {
  return { ...state, ...look.patch }
}

export function applyLayout(state: MockupState, layout: Layout): MockupState {
  const { zoom, offsetX, offsetY, rotateX, rotateY, rotateZ } = layout
  return { ...state, zoom, offsetX, offsetY, rotateX, rotateY, rotateZ }
}
