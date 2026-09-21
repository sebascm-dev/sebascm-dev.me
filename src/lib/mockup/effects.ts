// Effects & scenes: VFX overlays, watermark placement, shadow overlays and the
// 3D-ish shapes scene. Everything resolves to plain CSS values, so the canvas
// only paints layers and each effect can be tested without a browser.

import type { MockupState } from './state'

// ─── Shared helpers ─────────────────────────────────────────────────────────

const T = 'rgba(0, 0, 0, 0)'

/** Encodes an SVG for use inside a CSS url(); '#' must be escaped as %23. */
const svgUrl = (markup: string) => `url("data:image/svg+xml;utf8,${markup.replace(/#/g, '%23')}")`

/** Fractal-noise tile used by the grain effects. */
const NOISE_TILE = svgUrl(
  "<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>",
)

/** Small deterministic PRNG (mulberry32): the same seed always yields the same sequence. */
function random(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits

// ─── VFX ────────────────────────────────────────────────────────────────────

export type VfxId =
  | 'none'
  | 'noise'
  | 'vhs'
  | 'tv'
  | 'vhs-glitch'
  | 'tech-glitch'
  | 'light-leak'
  | 'particles'
  | 'glitter'

export const VFX_OPTIONS: { id: VfxId; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'noise', label: 'Noise' },
  { id: 'vhs', label: 'VHS' },
  { id: 'tv', label: 'TV' },
  { id: 'vhs-glitch', label: 'VHS Glitch' },
  { id: 'tech-glitch', label: 'Tech Glitch' },
  { id: 'light-leak', label: 'Light Leak' },
  { id: 'particles', label: 'Particles' },
  { id: 'glitter', label: 'Glitter' },
]

/** One overlay painted across the whole canvas, above the mockup. */
export type VfxLayer = {
  background: string
  opacity: number
  mixBlendMode?: string
  backgroundSize?: string
}

const SCANLINES = 'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.35) 0 1px, rgba(0, 0, 0, 0) 1px 3px)'

/** Soft bokeh dots, placed deterministically so every render matches. */
const PARTICLES = (() => {
  const next = random(7)
  return Array.from({ length: 26 }, () => {
    const size = round(0.3 + next() * 1.4)
    const alpha = round(0.35 + next() * 0.55)
    return `radial-gradient(circle at ${round(next() * 100)}% ${round(next() * 100)}%, rgba(255, 255, 255, ${alpha}) 0 ${size}%, ${T} ${round(size + 0.35)}%)`
  }).join(', ')
})()

const GLITTER =
  'radial-gradient(circle, rgba(255, 255, 255, 0.95) 0 1px, rgba(0, 0, 0, 0) 1.6px) 0 0 / 23px 23px, ' +
  'radial-gradient(circle, rgba(255, 244, 214, 0.85) 0 1px, rgba(0, 0, 0, 0) 1.6px) 11px 7px / 31px 31px, ' +
  'radial-gradient(circle, rgba(214, 240, 255, 0.8) 0 0.8px, rgba(0, 0, 0, 0) 1.4px) 5px 17px / 17px 17px'

/**
 * @param intensity 0-100; scales every layer's opacity.
 */
export function buildVfxLayers(vfx: VfxId, intensity: number): VfxLayer[] {
  if (vfx === 'none' || intensity <= 0) return []
  const k = Math.min(1, intensity / 100)
  const grain = (strength: number): VfxLayer => ({ background: NOISE_TILE, backgroundSize: '200px', opacity: round(k * strength), mixBlendMode: 'overlay' })

  switch (vfx) {
    case 'noise':
      return [grain(0.8)]
    case 'vhs':
      return [
        { background: SCANLINES, opacity: round(k * 0.7), mixBlendMode: 'multiply' },
        // Chromatic fringing: red on the left edge, cyan on the right.
        { background: `linear-gradient(90deg, rgba(255, 0, 80, 0.28), ${T} 18%, ${T} 82%, rgba(0, 200, 255, 0.28))`, opacity: round(k), mixBlendMode: 'screen' },
        grain(0.35),
      ]
    case 'tv':
      return [
        { background: 'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.5) 0 2px, rgba(0, 0, 0, 0) 2px 4px)', opacity: round(k * 0.75), mixBlendMode: 'multiply' },
        { background: `radial-gradient(ellipse at center, ${T} 55%, rgba(0, 0, 0, 0.75) 100%)`, opacity: round(k), mixBlendMode: 'normal' },
        { background: 'rgba(80, 255, 140, 0.12)', opacity: round(k), mixBlendMode: 'overlay' },
      ]
    case 'vhs-glitch':
      return [
        { background: SCANLINES, opacity: round(k * 0.6), mixBlendMode: 'multiply' },
        {
          background: `linear-gradient(180deg, ${T} 17%, rgba(255, 0, 120, 0.4) 17% 19.5%, ${T} 19.5% 45%, rgba(0, 255, 255, 0.35) 45% 46.5%, ${T} 46.5% 70%, rgba(255, 255, 255, 0.3) 70% 71.2%, ${T} 71.2% 86%, rgba(255, 0, 120, 0.3) 86% 87%, ${T} 87%)`,
          opacity: round(k),
          mixBlendMode: 'screen',
        },
        grain(0.3),
      ]
    case 'tech-glitch':
      return [
        {
          background: [
            'linear-gradient(rgba(0, 255, 255, 0.5), rgba(0, 255, 255, 0.5)) 12% 22% / 18% 3% no-repeat',
            'linear-gradient(rgba(255, 0, 200, 0.5), rgba(255, 0, 200, 0.5)) 64% 58% / 22% 2% no-repeat',
            'linear-gradient(rgba(255, 255, 255, 0.45), rgba(255, 255, 255, 0.45)) 30% 76% / 9% 4% no-repeat',
            'linear-gradient(rgba(0, 255, 120, 0.45), rgba(0, 255, 120, 0.45)) 84% 12% / 12% 2.5% no-repeat',
            'linear-gradient(rgba(255, 0, 200, 0.4), rgba(255, 0, 200, 0.4)) 6% 64% / 7% 6% no-repeat',
          ].join(', '),
          opacity: round(k),
          mixBlendMode: 'screen',
        },
        { background: 'repeating-linear-gradient(90deg, rgba(0, 255, 255, 0.07) 0 1px, rgba(0, 0, 0, 0) 1px 6px)', opacity: round(k), mixBlendMode: 'screen' },
      ]
    case 'light-leak':
      return [
        {
          background: `radial-gradient(60% 55% at 0% 0%, rgba(255, 120, 40, 0.95) 0%, ${T} 70%), radial-gradient(50% 45% at 100% 100%, rgba(255, 60, 120, 0.75) 0%, ${T} 70%), radial-gradient(40% 30% at 90% 10%, rgba(255, 220, 120, 0.5) 0%, ${T} 70%)`,
          opacity: round(0.25 + k * 0.75),
          mixBlendMode: 'screen',
        },
      ]
    case 'particles':
      return [{ background: PARTICLES, opacity: round(0.2 + k * 0.8), mixBlendMode: 'screen' }]
    case 'glitter':
      return [{ background: GLITTER, opacity: round(0.2 + k * 0.8), mixBlendMode: 'screen' }]
  }
}

// ─── Watermark ──────────────────────────────────────────────────────────────

export type WatermarkPosition = 'tl' | 'tc' | 'tr' | 'ml' | 'mc' | 'mr' | 'bl' | 'bc' | 'br'
export type WatermarkStyle = 'default' | 'shadow' | 'glass' | 'badge'

export const WATERMARK_POSITIONS: WatermarkPosition[] = ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br']

export const WATERMARK_STYLES: { id: WatermarkStyle; label: string }[] = [
  { id: 'default', label: 'Default' },
  { id: 'shadow', label: 'Shadow' },
  { id: 'glass', label: 'Glass' },
  { id: 'badge', label: 'Badge' },
]

/** CSS position for the watermark; the inset is a percentage of the canvas. */
export function watermarkPlacement(position: WatermarkPosition, inset: number): Record<string, string> {
  const edge = `${inset}%`
  const [row, column] = position.split('') as ['t' | 'm' | 'b', 'l' | 'c' | 'r']
  const placement: Record<string, string> = {}
  const transforms: string[] = []

  if (column === 'l') placement.left = edge
  else if (column === 'r') placement.right = edge
  else placement.left = '50%'

  if (row === 't') placement.top = edge
  else if (row === 'b') placement.bottom = edge
  else placement.top = '50%'

  if (column === 'c' && row === 'm') transforms.push('translate(-50%, -50%)')
  else if (column === 'c') transforms.push('translateX(-50%)')
  else if (row === 'm') transforms.push('translateY(-50%)')

  if (transforms.length) placement.transform = transforms.join(' ')
  return placement
}

type WatermarkPatch = Partial<
  Pick<MockupState, 'watermarkEnabled' | 'watermarkStyle' | 'watermarkTheme' | 'watermarkPosition' | 'watermarkSize' | 'watermarkInset'>
>

/** The carousel at the top of the watermark panel. */
export const WATERMARK_PRESETS: { id: string; label: string; patch: WatermarkPatch }[] = [
  { id: 'none', label: 'Sin marca de agua', patch: { watermarkEnabled: false } },
  { id: 'signature', label: 'Firma', patch: { watermarkEnabled: true, watermarkStyle: 'default', watermarkTheme: 'light', watermarkPosition: 'br', watermarkSize: 80, watermarkInset: 4 } },
  { id: 'badge', label: 'Badge', patch: { watermarkEnabled: true, watermarkStyle: 'badge', watermarkTheme: 'light', watermarkPosition: 'bc', watermarkSize: 80, watermarkInset: 5 } },
  { id: 'glass', label: 'Glass', patch: { watermarkEnabled: true, watermarkStyle: 'glass', watermarkTheme: 'dark', watermarkPosition: 'tl', watermarkSize: 70, watermarkInset: 4 } },
]

// ─── Shadow scene ───────────────────────────────────────────────────────────

export type ShadowScene = {
  id: string
  label: string
  /** Neutral (black) shapes only: shadows darken, they never tint. */
  css: string
  /** Softness in canvas pixels. */
  blur: number
  /** Extra transform, e.g. to skew a window frame into perspective. */
  transform?: string
}

/** A branch of alternating leaves drawn as ellipses along a stem. */
function leafBranch(leaves: number, length: number, leafSize: number, angle: number): string {
  const parts: string[] = []
  for (let i = 0; i < leaves; i++) {
    const t = (i + 1) / (leaves + 1)
    const x = 40 + t * length
    const side = i % 2 === 0 ? -1 : 1
    const size = leafSize * (1 - t * 0.35)
    parts.push(
      `<ellipse cx='${round(x)}' cy='${round(200 + side * size * 0.55)}' rx='${round(size)}' ry='${round(size * 0.38)}' transform='rotate(${side * 35} ${round(x)} 200)'/>`,
    )
  }
  return svgUrl(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400' preserveAspectRatio='xMidYMid slice'><g fill='black' transform='rotate(${angle} 200 200)'><rect x='40' y='198' width='${length}' height='4'/>${parts.join('')}</g></svg>`,
  )
}

/** Palm fronds radiating from a point just off-canvas. */
function palm(cx: number, cy: number): string {
  const fronds = Array.from({ length: 11 }, (_, i) => {
    const angle = -80 + i * 16
    return `<ellipse cx='${cx + 150}' cy='${cy}' rx='150' ry='16' transform='rotate(${angle} ${cx} ${cy})'/>`
  }).join('')
  return svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400' preserveAspectRatio='xMidYMid slice'><g fill='black'>${fronds}</g></svg>`)
}

/** Large rounded leaves, loosely scattered like a monstera. */
function bigLeaves(seed: number): string {
  const next = random(seed)
  const leaves = Array.from({ length: 6 }, () => {
    const x = round(next() * 400)
    const y = round(next() * 400)
    return `<ellipse cx='${x}' cy='${y}' rx='${round(40 + next() * 50)}' ry='${round(25 + next() * 30)}' transform='rotate(${round(next() * 180)} ${x} ${y})'/>`
  }).join('')
  return svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400' preserveAspectRatio='xMidYMid slice'><g fill='black'>${leaves}</g></svg>`)
}

const cover = (url: string) => `${url} center / cover no-repeat`
const stripes = (angle: number, gap: number, bar: number, alpha: number) =>
  `repeating-linear-gradient(${angle}deg, ${T} 0 ${gap}%, rgba(0, 0, 0, ${alpha}) ${gap}% ${gap + bar}%)`
const cross = (alpha: number) =>
  `linear-gradient(90deg, ${T} 47%, rgba(0, 0, 0, ${alpha}) 47% 53%, ${T} 53%), linear-gradient(0deg, ${T} 47%, rgba(0, 0, 0, ${alpha}) 47% 53%, ${T} 53%)`

export const SHADOW_SCENES: ShadowScene[] = [
  { id: 'blinds', label: 'Persianas', css: stripes(115, 7, 5, 0.34), blur: 16 },
  { id: 'blinds-steep', label: 'Persianas verticales', css: stripes(80, 8, 4, 0.3), blur: 14 },
  { id: 'blinds-wide', label: 'Persianas anchas', css: stripes(135, 12, 9, 0.28), blur: 22 },
  { id: 'window', label: 'Ventana', css: cross(0.45), blur: 12 },
  { id: 'window-skewed', label: 'Ventana en ángulo', css: cross(0.4), blur: 16, transform: 'skewX(-18deg) scale(1.4)' },
  { id: 'window-panes', label: 'Cristalera', css: `${stripes(90, 22, 3, 0.4)}, ${stripes(0, 30, 3, 0.4)}`, blur: 10 },
  { id: 'leaves', label: 'Hojas', css: cover(leafBranch(9, 320, 42, -25)), blur: 10 },
  { id: 'leaves-large', label: 'Hojas grandes', css: cover(leafBranch(6, 300, 70, 30)), blur: 16 },
  { id: 'palm', label: 'Palmera', css: cover(palm(40, 40)), blur: 14 },
  { id: 'palm-corner', label: 'Palmera en esquina', css: cover(palm(380, 380)), blur: 18 },
  { id: 'monstera', label: 'Monstera', css: cover(bigLeaves(11)), blur: 20 },
  { id: 'foliage', label: 'Follaje', css: cover(bigLeaves(29)), blur: 26 },
  { id: 'branch', label: 'Rama', css: cover(leafBranch(12, 340, 30, 60)), blur: 8 },
  { id: 'dappled', label: 'Luz moteada', css: `radial-gradient(20% 16% at 20% 30%, rgba(0, 0, 0, 0.35) 0%, ${T} 70%), radial-gradient(18% 14% at 70% 20%, rgba(0, 0, 0, 0.3) 0%, ${T} 70%), radial-gradient(24% 18% at 55% 75%, rgba(0, 0, 0, 0.32) 0%, ${T} 70%), radial-gradient(16% 12% at 88% 65%, rgba(0, 0, 0, 0.28) 0%, ${T} 70%)`, blur: 18 },
  { id: 'corner', label: 'Sombra de esquina', css: `radial-gradient(90% 90% at 0% 0%, rgba(0, 0, 0, 0.5) 0%, ${T} 65%)`, blur: 20 },
  { id: 'diagonal', label: 'Diagonal', css: `linear-gradient(125deg, rgba(0, 0, 0, 0.45) 0%, ${T} 55%)`, blur: 10 },
]

export function findShadowScene(id: string): ShadowScene {
  return SHADOW_SCENES.find((s) => s.id === id) ?? SHADOW_SCENES[0]
}

// ─── Shapes scene ───────────────────────────────────────────────────────────

export type ShapeKind = 'cube' | 'torus' | 'sphere' | 'pill' | 'cone' | 'star' | 'diamond'

export const SHAPE_KINDS: { id: ShapeKind; label: string }[] = [
  { id: 'cube', label: 'Cubo' },
  { id: 'torus', label: 'Aro' },
  { id: 'sphere', label: 'Esfera' },
  { id: 'pill', label: 'Cápsula' },
  { id: 'cone', label: 'Cono' },
  { id: 'star', label: 'Estrella' },
  { id: 'diamond', label: 'Rombo' },
]

/** One shape of the scene; x, y and size are percentages of the canvas width/height. */
export type ShapeItem = { kind: ShapeKind; x: number; y: number; size: number; rotate: number }

const s = (kind: ShapeKind, x: number, y: number, size: number, rotate = 0): ShapeItem => ({ kind, x, y, size, rotate })

// Hand-placed layouts that frame the mockup without covering its centre.
export const SHAPE_COMPOSITIONS: ShapeItem[][] = [
  [s('cube', 12, 78, 18, 20), s('torus', 86, 18, 16, -20), s('sphere', 88, 80, 12), s('pill', 18, 18, 14, 40), s('cone', 60, 90, 10, 15)],
  [s('torus', 14, 20, 20, 30), s('sphere', 86, 70, 18), s('star', 82, 14, 12, 12), s('diamond', 16, 82, 12, 45)],
  [s('sphere', 10, 14, 16), s('sphere', 90, 86, 22), s('pill', 88, 24, 12, -35), s('cube', 12, 84, 12, 10)],
  [s('star', 14, 76, 18, -10), s('star', 88, 22, 14, 20), s('torus', 84, 82, 12, 60), s('sphere', 18, 16, 10)],
  [s('cone', 12, 22, 16, -20), s('cube', 86, 78, 18, 35), s('diamond', 88, 16, 12, 45), s('pill', 16, 84, 14, -40), s('sphere', 50, 8, 8)],
  [s('pill', 10, 50, 18, 90), s('pill', 90, 50, 18, 90), s('sphere', 50, 92, 10), s('torus', 50, 8, 10)],
  [s('diamond', 16, 20, 18, 45), s('torus', 86, 84, 18, -30), s('cube', 86, 16, 12, 15), s('star', 14, 82, 12, 8), s('sphere', 52, 90, 8)],
]

/** Scatters shapes around the edges, keeping the centre free for the mockup. */
function randomComposition(seed: number): ShapeItem[] {
  const next = random(seed)
  const count = 4 + Math.floor(next() * 3)
  return Array.from({ length: count }, () => {
    // Pick an edge band so the shape frames the mockup rather than covering it.
    const horizontalEdge = next() < 0.5
    const band = () => (next() < 0.5 ? 6 + next() * 22 : 72 + next() * 22)
    return {
      kind: SHAPE_KINDS[Math.floor(next() * SHAPE_KINDS.length)].id,
      x: round(horizontalEdge ? 6 + next() * 88 : band(), 1),
      y: round(horizontalEdge ? band() : 6 + next() * 88, 1),
      size: round(8 + next() * 14, 1),
      rotate: Math.round(next() * 360),
    }
  })
}

export function buildShapes({
  composition,
  kind,
  seed,
}: {
  composition: number
  /** When set, every shape of the layout is drawn as this kind. */
  kind: ShapeKind | null
  /** When set, a randomised layout replaces the hand-placed composition. */
  seed: number | null
}): ShapeItem[] {
  const count = SHAPE_COMPOSITIONS.length
  const base = seed !== null ? randomComposition(seed) : SHAPE_COMPOSITIONS[((composition % count) + count) % count]
  return kind ? base.map((item) => ({ ...item, kind })) : base
}
