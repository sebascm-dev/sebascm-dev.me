import { describe, it, expect } from 'vitest'
import {
  SHADOW_SCENES,
  SHAPE_COMPOSITIONS,
  SHAPE_KINDS,
  VFX_OPTIONS,
  WATERMARK_PRESETS,
  buildShapes,
  buildVfxLayers,
  findShadowScene,
  watermarkPlacement,
} from '../mockup/effects'

describe('buildVfxLayers', () => {
  it('draws nothing for none or at zero intensity', () => {
    expect(buildVfxLayers('none', 80)).toEqual([])
    expect(buildVfxLayers('vhs', 0)).toEqual([])
  })

  it('builds at least one layer for every effect on offer', () => {
    for (const option of VFX_OPTIONS.filter((o) => o.id !== 'none')) {
      expect(buildVfxLayers(option.id, 60).length).toBeGreaterThan(0)
    }
  })

  // Intensity is the one knob: it must visibly scale the effect.
  it('scales the layer opacity with the intensity', () => {
    const soft = buildVfxLayers('light-leak', 20)[0].opacity
    const strong = buildVfxLayers('light-leak', 100)[0].opacity
    expect(strong).toBeGreaterThan(soft)
    expect(strong).toBeLessThanOrEqual(1)
  })

  it('offers the shots.so effect list', () => {
    expect(VFX_OPTIONS.map((o) => o.id)).toEqual([
      'none', 'noise', 'vhs', 'tv', 'vhs-glitch', 'tech-glitch', 'light-leak', 'particles', 'glitter',
    ])
  })
})

describe('watermarkPlacement', () => {
  it('pins a corner position by its two edges, inset by a share of the canvas', () => {
    expect(watermarkPlacement('br', 5)).toEqual({ right: '5%', bottom: '5%' })
    expect(watermarkPlacement('tl', 3)).toEqual({ left: '3%', top: '3%' })
  })

  // Centred positions cannot use a single edge; they centre with a transform.
  it('centres the middle positions with a transform', () => {
    expect(watermarkPlacement('bc', 5)).toEqual({ left: '50%', bottom: '5%', transform: 'translateX(-50%)' })
    expect(watermarkPlacement('mc', 5)).toEqual({ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' })
    expect(watermarkPlacement('ml', 4)).toEqual({ left: '4%', top: '50%', transform: 'translateY(-50%)' })
  })

  it('starts the preset carousel with the "no watermark" entry', () => {
    expect(WATERMARK_PRESETS[0].patch.watermarkEnabled).toBe(false)
    expect(WATERMARK_PRESETS.slice(1).every((p) => p.patch.watermarkEnabled)).toBe(true)
  })
})

describe('shadow scenes', () => {
  it('offers a wide set of overlays with unique ids', () => {
    expect(SHADOW_SCENES.length).toBeGreaterThanOrEqual(12)
    expect(new Set(SHADOW_SCENES.map((s) => s.id)).size).toBe(SHADOW_SCENES.length)
  })

  it('falls back to the first overlay for an unknown id', () => {
    expect(findShadowScene('nope')).toBe(SHADOW_SCENES[0])
  })

  // Shadows darken whatever is under them; any hue would tint the mockup.
  it('only uses neutral shadow colours', () => {
    for (const scene of SHADOW_SCENES) {
      expect(scene.css).not.toMatch(/#(?![0f]{3}\b|000000|ffffff)[0-9a-f]{3,6}\b/i)
    }
  })
})

describe('buildShapes', () => {
  it('lays out the chosen composition', () => {
    const shapes = buildShapes({ composition: 0, kind: null, seed: null })
    expect(shapes.length).toBe(SHAPE_COMPOSITIONS[0].length)
  })

  it('replaces every shape with the picked kind', () => {
    const shapes = buildShapes({ composition: 1, kind: 'sphere', seed: null })
    expect(shapes.every((s) => s.kind === 'sphere')).toBe(true)
  })

  // Randomize must be reproducible: the same seed has to redraw the same scene
  // after an undo, a re-render or an export.
  it('generates the same random scene for the same seed', () => {
    const a = buildShapes({ composition: 0, kind: null, seed: 42 })
    const b = buildShapes({ composition: 0, kind: null, seed: 42 })
    expect(a).toEqual(b)
    expect(buildShapes({ composition: 0, kind: null, seed: 7 })).not.toEqual(a)
  })

  it('keeps random shapes inside the canvas and of a sensible size', () => {
    for (const shape of buildShapes({ composition: 0, kind: null, seed: 123 })) {
      expect(shape.x).toBeGreaterThanOrEqual(-10)
      expect(shape.x).toBeLessThanOrEqual(110)
      expect(shape.size).toBeGreaterThan(0)
      expect(SHAPE_KINDS.map((k) => k.id)).toContain(shape.kind)
    }
  })

  it('wraps the composition index so the carousel can cycle freely', () => {
    expect(buildShapes({ composition: SHAPE_COMPOSITIONS.length, kind: null, seed: null })).toEqual(
      buildShapes({ composition: 0, kind: null, seed: null }),
    )
  })
})
