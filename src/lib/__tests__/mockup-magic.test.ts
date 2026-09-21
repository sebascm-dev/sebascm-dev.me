import { describe, it, expect } from 'vitest'
import { buildMagicBackgrounds } from '../mockup/palette'
import { buildMagicLooks } from '../mockup/magic'
import { DEFAULT_MOCKUP_STATE, applyLook } from '../mockup'

const DARK_UI = ['#0f0f10', '#1c1c1f', '#22d3ee', '#a855f7']
const LIGHT_UI = ['#fafafa', '#e5e7eb', '#6d28d9']
const GREY_UI = ['#ffffff', '#d4d4d8', '#27272a']

function toneOf(palette: string[], backgroundId: string | undefined) {
  return buildMagicBackgrounds(palette).find((b) => b.id === backgroundId)?.tone
}

describe('buildMagicLooks', () => {
  it('returns nothing without a screenshot palette', () => {
    expect(buildMagicLooks([])).toEqual([])
  })

  it('builds several looks with unique ids', () => {
    const looks = buildMagicLooks(DARK_UI)
    expect(looks.length).toBeGreaterThanOrEqual(4)
    expect(new Set(looks.map((l) => l.id)).size).toBe(looks.length)
  })

  it('only points at magic backgrounds that actually exist for the palette', () => {
    for (const palette of [DARK_UI, LIGHT_UI, GREY_UI]) {
      const ids = buildMagicBackgrounds(palette).map((b) => b.id)
      expect(buildMagicLooks(palette).every((l) => ids.includes(l.patch.backgroundId!))).toBe(true)
    }
  })

  // The first look is the one people see first, so it must make the
  // screenshot stand out: never a dark background behind a dark interface…
  it('opens with a contrasting background for a dark interface', () => {
    expect(toneOf(DARK_UI, buildMagicLooks(DARK_UI)[0].patch.backgroundId)).not.toBe('dark')
  })

  // …and never a light background behind a light one.
  it('opens with a contrasting background for a light interface', () => {
    expect(toneOf(LIGHT_UI, buildMagicLooks(LIGHT_UI)[0].patch.backgroundId)).not.toBe('light')
  })

  // A coloured glow reads beautifully on a dark backdrop and muddy on a light one.
  it('only uses the adaptive glow shadow on dark backgrounds', () => {
    for (const palette of [DARK_UI, LIGHT_UI, GREY_UI]) {
      for (const look of buildMagicLooks(palette)) {
        if (look.patch.shadowMode === 'adaptive') expect(toneOf(palette, look.patch.backgroundId)).toBe('dark')
      }
    }
  })

  it('restyles the mockup without touching the canvas, device or export options', () => {
    const next = applyLook(DEFAULT_MOCKUP_STATE, buildMagicLooks(LIGHT_UI)[0])
    expect(next.width).toBe(DEFAULT_MOCKUP_STATE.width)
    expect(next.deviceId).toBe(DEFAULT_MOCKUP_STATE.deviceId)
    expect(next.exportFormat).toBe(DEFAULT_MOCKUP_STATE.exportFormat)
    expect(next.backgroundId).toMatch(/^magic-/)
  })

  it('still builds looks for a greyscale screenshot', () => {
    expect(buildMagicLooks(GREY_UI).length).toBeGreaterThan(0)
  })
})
