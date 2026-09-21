import { describe, it, expect } from 'vitest'
import {
  MAGIC_GROUPS,
  analysePalette,
  buildMagicBackgrounds,
  extractPalette,
  luminance,
  pickBrandColors,
  rgbToHex,
  saturation,
} from '../mockup/palette'

/** Builds an RGBA pixel buffer from [r, g, b, a, count] runs. */
function pixels(runs: [number, number, number, number, number][]): Uint8ClampedArray {
  const values: number[] = []
  for (const [r, g, b, a, count] of runs) {
    for (let i = 0; i < count; i++) values.push(r, g, b, a)
  }
  return new Uint8ClampedArray(values)
}

describe('rgbToHex', () => {
  it('formats channels as a lowercase hex colour', () => {
    expect(rgbToHex(34, 211, 238)).toBe('#22d3ee')
    expect(rgbToHex(0, 0, 0)).toBe('#000000')
  })
})

describe('luminance', () => {
  it('spans from black to white', () => {
    expect(luminance('#000000')).toBe(0)
    expect(luminance('#ffffff')).toBe(1)
  })

  // Perceived brightness: green reads far brighter than blue at equal values.
  it('weighs channels the way the eye does', () => {
    expect(luminance('#00ff00')).toBeGreaterThan(luminance('#0000ff'))
  })
})

describe('saturation', () => {
  it('is zero for greys and one for pure hues', () => {
    expect(saturation('#808080')).toBe(0)
    expect(saturation('#ff0000')).toBe(1)
  })
})

describe('extractPalette', () => {
  it('returns the dominant colours ordered by how much of the image they cover', () => {
    const palette = extractPalette(
      pixels([
        [240, 20, 20, 255, 60],
        [20, 20, 240, 255, 30],
        [20, 220, 20, 255, 10],
      ]),
      3,
    )
    expect(palette).toHaveLength(3)
    // Buckets average their pixels, so compare by dominant channel, not exact hex.
    expect(parseInt(palette[0].slice(1, 3), 16)).toBeGreaterThan(200)
    expect(parseInt(palette[1].slice(5, 7), 16)).toBeGreaterThan(200)
  })

  // Transparent pixels carry no visible colour; counting them would make the
  // palette of a PNG with a transparent border come out black.
  it('ignores transparent pixels', () => {
    const palette = extractPalette(pixels([[0, 0, 0, 0, 90], [240, 20, 20, 255, 10]]), 3)
    expect(palette).toHaveLength(1)
  })

  it('merges near-identical shades into a single colour', () => {
    expect(extractPalette(pixels([[240, 20, 20, 255, 50], [236, 24, 18, 255, 50]]), 3)).toHaveLength(1)
  })

  it('never returns more colours than requested', () => {
    const palette = extractPalette(
      pixels([
        [255, 0, 0, 255, 10],
        [0, 255, 0, 255, 10],
        [0, 0, 255, 255, 10],
        [255, 255, 0, 255, 10],
      ]),
      2,
    )
    expect(palette).toHaveLength(2)
  })

  it('returns an empty palette for an empty or fully transparent image', () => {
    expect(extractPalette(new Uint8ClampedArray(), 3)).toEqual([])
    expect(extractPalette(pixels([[0, 0, 0, 0, 20]]), 3)).toEqual([])
  })
})

describe('pickBrandColors', () => {
  // A screenshot is mostly UI chrome; the brand lives in the few vivid pixels.
  // Ranked by chroma, not HSL saturation, which overrates pastels: a pale lilac
  // scores higher saturation than an intense red, yet the red reads more vivid.
  it('drops neutrals and keeps the vivid colours, most vivid first', () => {
    expect(pickBrandColors(['#ffffff', '#1f2937', '#a78bfa', '#ef4444'])).toEqual(['#ef4444', '#a78bfa'])
  })

  it('returns nothing for a greyscale screenshot', () => {
    expect(pickBrandColors(['#ffffff', '#111111', '#808080'])).toEqual([])
  })

  // Near-black navy is technically saturated but reads as a neutral backdrop.
  it('ignores colours too dark or too light to carry a hue', () => {
    expect(pickBrandColors(['#050814', '#fdfcff'])).toEqual([])
  })
})

describe('analysePalette', () => {
  it('reads a dark interface as dark', () => {
    const analysis = analysePalette(['#0f0f10', '#22d3ee'])
    expect(analysis.tone).toBe('dark')
    expect(analysis.brand).toEqual(['#22d3ee'])
  })

  it('reads a light interface as light', () => {
    expect(analysePalette(['#fafafa', '#6d28d9']).tone).toBe('light')
  })

  it('flags a screenshot with no brand colour as muted', () => {
    expect(analysePalette(['#ffffff', '#e5e7eb']).vivid).toBe(false)
    expect(analysePalette(['#ffffff', '#6d28d9']).vivid).toBe(true)
  })
})

describe('buildMagicBackgrounds', () => {
  it('builds a large, varied set from a palette, with sequential magic ids', () => {
    const backgrounds = buildMagicBackgrounds(['#ff0000', '#00ff00', '#0000ff'])
    expect(backgrounds.length).toBeGreaterThanOrEqual(20)
    expect(backgrounds.every((b, i) => b.id === `magic-${i}`)).toBe(true)
  })

  it('files every background under one of the magic groups', () => {
    const backgrounds = buildMagicBackgrounds(['#0f0f10', '#22d3ee'])
    const groups = new Set(backgrounds.map((b) => b.group))
    expect(groups.size).toBeGreaterThanOrEqual(4)
    expect([...groups].every((g) => MAGIC_GROUPS.some((m) => m.id === g))).toBe(true)
  })

  // The brand is the point of Magic: it must lead, not be buried under the
  // dominant white of a light interface.
  it('leads with the brand colour when the screenshot has one', () => {
    const backgrounds = buildMagicBackgrounds(['#ffffff', '#f1f1f1', '#6d28d9'])
    const withBrand = backgrounds.filter((b) => b.css.includes('#6d28d9'))
    expect(withBrand.length).toBeGreaterThanOrEqual(backgrounds.length / 2)
  })

  // Regression: a black-and-white screenshot used to get an invented cyan.
  // Magic must stay inside the screenshot's own colours.
  it('keeps a greyscale screenshot strictly greyscale', () => {
    const backgrounds = buildMagicBackgrounds(['#ffffff', '#1f1f1f', '#8a8a8a'])
    expect(backgrounds.length).toBeGreaterThan(0)
    for (const background of backgrounds) {
      const colours = background.css.match(/#[0-9a-f]{6}/g) ?? []
      expect(colours.every((hex) => saturation(hex) < 0.05)).toBe(true)
    }
  })

  it('tags every background with a tone the presets can reason about', () => {
    const backgrounds = buildMagicBackgrounds(['#0f0f10', '#22d3ee'])
    expect(backgrounds.every((b) => b.tone === 'dark' || b.tone === 'light' || b.tone === 'vivid')).toBe(true)
    expect(new Set(backgrounds.map((b) => b.tone)).size).toBeGreaterThan(1)
  })

  // Presets need a contrasting option whatever the screenshot looks like.
  it('always offers both a dark and a light background', () => {
    for (const palette of [['#fafafa', '#e5e7eb'], ['#0a0a0a', '#1c1c1c'], ['#6d28d9']]) {
      const tones = buildMagicBackgrounds(palette).map((b) => b.tone)
      expect(tones).toContain('dark')
      expect(tones).toContain('light')
    }
  })

  it('returns nothing without a palette', () => {
    expect(buildMagicBackgrounds([])).toEqual([])
  })
})
