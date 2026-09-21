// "Magic" backgrounds: read the colours of the screenshot and compose
// gradients from them. No model involved — a colour histogram plus a few
// perceptual rules is enough, and it runs instantly, offline and for free.

import type { BackgroundPreset, BackgroundTone } from './catalog'

/** Pixels with less alpha than this are treated as empty space. */
const MIN_ALPHA = 128
/** Colours closer than this (RGB euclidean distance) count as the same colour. */
const MIN_DISTANCE = 48
/** Minimum chroma (0-1) for a colour to count as a brand colour, not a neutral. */
const BRAND_MIN_CHROMA = 0.25
/** HSL lightness band where a colour still visibly carries its hue. */
const BRAND_LIGHTNESS = [0.18, 0.9] as const

type Rgb = [number, number, number]

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`
}

function hexToRgb(hex: string): Rgb {
  const value = parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function distance(a: Rgb, b: Rgb): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

/** Mixes a colour towards another; amount 0 keeps `hex`, 1 returns `target`. */
export function mixHex(hex: string, target: string, amount: number): string {
  const [r1, g1, b1] = hexToRgb(hex)
  const [r2, g2, b2] = hexToRgb(target)
  return rgbToHex(r1 + (r2 - r1) * amount, g1 + (g2 - g1) * amount, b1 + (b2 - b1) * amount)
}

/** WCAG relative luminance, 0 (black) to 1 (white): perceived brightness. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return Math.round((0.2126 * r + 0.7152 * g + 0.0722 * b) * 10000) / 10000
}

/** max - min of the channels, and the HSL lightness, both 0-1. */
function chromaAndLightness(hex: string): { chroma: number; lightness: number } {
  const channels = hexToRgb(hex).map((c) => c / 255)
  const max = Math.max(...channels)
  const min = Math.min(...channels)
  return { chroma: max - min, lightness: (max + min) / 2 }
}

/** HSL saturation, 0 (grey) to 1 (pure hue). */
export function saturation(hex: string): number {
  const { chroma, lightness } = chromaAndLightness(hex)
  if (chroma === 0) return 0
  return Math.round((chroma / (1 - Math.abs(2 * lightness - 1))) * 10000) / 10000
}

/**
 * Buckets every opaque pixel into a 16-level-per-channel grid, then walks the
 * buckets from most to least common and keeps each one that is visibly
 * different from the colours already picked.
 *
 * @param pixels RGBA bytes, as returned by `CanvasRenderingContext2D.getImageData`.
 */
export function extractPalette(pixels: Uint8ClampedArray, maxColors: number): string[] {
  const buckets = new Map<number, { r: number; g: number; b: number; count: number }>()

  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if (pixels[i + 3] < MIN_ALPHA) continue
    const r = pixels[i]
    const g = pixels[i + 1]
    const b = pixels[i + 2]
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const bucket = buckets.get(key)
    if (bucket) {
      bucket.r += r
      bucket.g += g
      bucket.b += b
      bucket.count++
    } else {
      buckets.set(key, { r, g, b, count: 1 })
    }
  }

  const ranked = [...buckets.values()].sort((a, b) => b.count - a.count)
  const picked: Rgb[] = []

  for (const bucket of ranked) {
    if (picked.length >= maxColors) break
    const colour: Rgb = [bucket.r / bucket.count, bucket.g / bucket.count, bucket.b / bucket.count]
    if (picked.every((existing) => distance(existing, colour) >= MIN_DISTANCE)) picked.push(colour)
  }

  return picked.map(([r, g, b]) => rgbToHex(r, g, b))
}

/**
 * The colours that identify the product. A screenshot is mostly neutral UI —
 * white or dark surfaces, grey text — so the dominant colour is almost never
 * the brand. Keeps the visibly coloured entries, most vivid first.
 */
export function pickBrandColors(palette: string[]): string[] {
  return palette
    .map((hex) => ({ hex, ...chromaAndLightness(hex) }))
    .filter(
      (c) => c.chroma >= BRAND_MIN_CHROMA && c.lightness >= BRAND_LIGHTNESS[0] && c.lightness <= BRAND_LIGHTNESS[1],
    )
    .sort((a, b) => b.chroma - a.chroma)
    .map((c) => c.hex)
}

export type PaletteAnalysis = {
  /** Most common colour — in practice, the interface's surface. */
  dominant: string
  /** Brightness of the interface, used to pick contrasting backgrounds. */
  tone: 'dark' | 'light' | 'mid'
  brand: string[]
  /** Whether the screenshot has any brand colour at all. */
  vivid: boolean
}

export function analysePalette(palette: string[]): PaletteAnalysis {
  const dominant = palette[0] ?? '#808080'
  const brightness = luminance(dominant)
  const brand = pickBrandColors(palette)
  return {
    dominant,
    tone: brightness < 0.2 ? 'dark' : brightness > 0.6 ? 'light' : 'mid',
    brand,
    vivid: brand.length > 0,
  }
}

export const MAGIC_GROUPS = [
  { id: 'tones', label: 'Tonos' },
  { id: 'gradient', label: 'Degradados' },
  { id: 'mesh', label: 'Mesh' },
  { id: 'glow', label: 'Glow' },
  { id: 'wave', label: 'Ondas' },
] as const

export type MagicGroupId = (typeof MAGIC_GROUPS)[number]['id']

/**
 * How a background reads, judged by the colour that covers most of it: dark
 * and light by brightness, vivid when a mid-bright colour carries real hue.
 */
function toneOf(base: string): BackgroundTone {
  const brightness = luminance(base)
  if (brightness < 0.25) return 'dark'
  if (brightness > 0.6) return 'light'
  if (chromaAndLightness(base).chroma >= BRAND_MIN_CHROMA) return 'vivid'
  return brightness < 0.42 ? 'dark' : 'light'
}

/**
 * Composes Magic backgrounds from a palette, ids `magic-0`, `magic-1`…
 *
 * Every colour comes from the screenshot itself — brand colours lead, and
 * neutrals count too, so a black-and-white capture gets refined greyscale
 * backgrounds instead of an invented hue. Each background is tagged with a
 * group for the panel and a tone so the Magic Presets can pick by contrast.
 */
export function buildMagicBackgrounds(palette: string[]): BackgroundPreset[] {
  if (palette.length === 0) return []
  const { brand } = analysePalette(palette)

  // Brand colours first, then the rest in order of coverage.
  const ordered = [...brand, ...palette.filter((hex) => !brand.includes(hex))]
  const byBrightness = [...palette].sort((x, y) => luminance(x) - luminance(y))
  const darkest = byBrightness[0]
  const lightest = byBrightness[byBrightness.length - 1]

  // Guaranteed extremes, so there is always a dark and a light backdrop even
  // when the screenshot itself sits entirely at one end of the range.
  const D = luminance(darkest) < 0.04 ? darkest : mixHex(darkest, '#000000', 0.85)
  const L = luminance(lightest) > 0.85 ? lightest : mixHex(lightest, '#ffffff', 0.88)

  // Short palettes borrow shades of their own colours for the missing stops.
  const a = ordered[0]
  const b = ordered[1] ?? mixHex(a, luminance(a) > 0.5 ? '#000000' : '#ffffff', 0.35)
  const c = ordered[2] ?? mixHex(b, luminance(b) > 0.5 ? '#000000' : '#ffffff', 0.3)
  const d = ordered[3] ?? mixHex(a, c, 0.5)

  const recipes: { group: MagicGroupId; css: string; base: string }[] = [
    // Tonos — each colour as a flat backdrop, plus a soft vertical sheen.
    ...ordered.slice(0, 3).map((hex) => ({ group: 'tones' as const, css: hex, base: hex })),
    { group: 'tones', css: `linear-gradient(180deg, ${mixHex(a, '#ffffff', 0.18)} 0%, ${mixHex(a, '#000000', 0.18)} 100%)`, base: a },

    // Degradados — two-stop linear blends anchored on the lead colour.
    { group: 'gradient', css: `linear-gradient(135deg, ${a} 0%, ${b} 100%)`, base: mixHex(a, b, 0.5) },
    { group: 'gradient', css: `linear-gradient(135deg, ${a} 0%, ${c} 100%)`, base: mixHex(a, c, 0.5) },
    { group: 'gradient', css: `linear-gradient(160deg, ${L} 0%, ${a} 100%)`, base: mixHex(L, a, 0.5) },
    { group: 'gradient', css: `linear-gradient(160deg, ${a} 0%, ${D} 100%)`, base: mixHex(a, D, 0.5) },
    { group: 'gradient', css: `linear-gradient(180deg, ${a} 0%, ${mixHex(a, b, 0.5)} 100%)`, base: a },
    { group: 'gradient', css: `linear-gradient(45deg, ${d} 0%, ${a} 100%)`, base: mixHex(a, d, 0.5) },

    // Mesh — four soft corner blooms over a blended base.
    {
      group: 'mesh',
      css: `radial-gradient(at 0% 0%, ${a} 0px, transparent 60%), radial-gradient(at 100% 0%, ${b} 0px, transparent 55%), radial-gradient(at 100% 100%, ${c} 0px, transparent 60%), radial-gradient(at 0% 100%, ${d} 0px, transparent 55%), ${mixHex(a, b, 0.5)}`,
      base: mixHex(a, b, 0.5),
    },
    {
      group: 'mesh',
      css: `radial-gradient(at 20% 30%, ${a} 0px, transparent 55%), radial-gradient(at 80% 70%, ${b} 0px, transparent 55%), ${L}`,
      base: L,
    },
    {
      group: 'mesh',
      css: `radial-gradient(at 25% 20%, ${a} 0px, transparent 55%), radial-gradient(at 75% 85%, ${c} 0px, transparent 55%), ${D}`,
      base: D,
    },
    {
      group: 'mesh',
      css: `radial-gradient(at 50% 0%, ${a} 0px, transparent 60%), radial-gradient(at 0% 100%, ${b} 0px, transparent 50%), radial-gradient(at 100% 100%, ${d} 0px, transparent 50%), ${mixHex(a, D, 0.6)}`,
      base: mixHex(a, D, 0.6),
    },

    // Glow — a single light source spilling across a dark or light field.
    { group: 'glow', css: `radial-gradient(120% 120% at 100% 0%, ${a} 0%, transparent 55%), ${D}`, base: D },
    { group: 'glow', css: `radial-gradient(130% 70% at 50% 115%, ${a} 0%, ${b} 35%, transparent 70%), ${D}`, base: D },
    { group: 'glow', css: `radial-gradient(60% 60% at 50% 50%, ${mixHex(a, '#ffffff', 0.3)} 0%, ${L} 70%)`, base: L },
    { group: 'glow', css: `radial-gradient(90% 90% at 0% 100%, ${a} 0%, transparent 60%), radial-gradient(70% 70% at 100% 0%, ${b} 0%, transparent 55%), ${L}`, base: L },

    // Ondas — the wide arc rising from the bottom edge.
    { group: 'wave', css: `radial-gradient(160% 100% at 50% 130%, ${a} 0 38%, ${mixHex(a, L, 0.5)} 46%, ${L} 60%)`, base: L },
    { group: 'wave', css: `radial-gradient(150% 90% at 50% 125%, ${L} 0 30%, ${a} 42%, ${D} 60%)`, base: D },
    { group: 'wave', css: `radial-gradient(140% 90% at 50% 120%, ${a} 0 35%, ${b} 48%, ${mixHex(b, L, 0.6)} 62%, ${L} 75%)`, base: L },
    { group: 'wave', css: `radial-gradient(130% 80% at 50% 125%, ${a} 0 32%, ${mixHex(a, D, 0.5)} 50%, ${D} 70%)`, base: D },
  ]

  return recipes.map((recipe, index) => ({
    id: `magic-${index}`,
    label: `${MAGIC_GROUPS.find((g) => g.id === recipe.group)!.label} ${index + 1}`,
    css: recipe.css,
    tone: toneOf(recipe.base),
    group: recipe.group,
  }))
}
