import { describe, it, expect } from 'vitest'
import { TEMPLATES, TEMPLATE_CATEGORIES, applyTemplate } from '../mockup/templates'
import { BACKGROUNDS, DEFAULT_MOCKUP_STATE, DEVICES, SHADOW_SCENES, arrangementsFor } from '../mockup'

describe('templates', () => {
  it('fills every shots.so category with unique templates', () => {
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length)
    for (const category of TEMPLATE_CATEGORIES) {
      expect(TEMPLATES.filter((t) => t.category === category.id).length).toBeGreaterThanOrEqual(2)
    }
  })

  // Ids like "cosmic-5" are generated, so a typo would only surface as a
  // silently wrong background at runtime. Pin every reference down here.
  it('only references devices, backgrounds, scenes and arrangements that exist', () => {
    for (const { patch } of TEMPLATES) {
      if (patch.deviceId) {
        const device = DEVICES.find((d) => d.id === patch.deviceId)
        expect(device, patch.deviceId).toBeDefined()
        if (patch.variantId) expect(device!.variants.map((v) => v.id)).toContain(patch.variantId)
      }
      if (patch.backgroundId) expect(BACKGROUNDS.map((b) => b.id), patch.backgroundId).toContain(patch.backgroundId)
      if (patch.sceneShadowId) expect(SHADOW_SCENES.map((s) => s.id)).toContain(patch.sceneShadowId)
      if (patch.count && patch.count > 1) {
        expect(arrangementsFor(patch.count).map((a) => a.id)).toContain(patch.arrangementId)
      }
    }
  })

  it('restyles the canvas but keeps the export options', () => {
    const custom = { ...DEFAULT_MOCKUP_STATE, exportFormat: 'webp' as const, exportScale: 3 as const }
    const next = applyTemplate(custom, TEMPLATES[0])
    expect(next.exportFormat).toBe('webp')
    expect(next.exportScale).toBe(3)
    expect(next.deviceId).toBe(TEMPLATES[0].patch.deviceId ?? DEFAULT_MOCKUP_STATE.deviceId)
  })

  // A template is a fresh start: leftovers from the previous look (a VFX, a
  // watermark, a tilt) must not leak into it.
  it('resets everything the template does not set', () => {
    const cluttered = { ...DEFAULT_MOCKUP_STATE, vfx: 'vhs' as const, watermarkEnabled: true, rotateZ: 30 }
    const template = TEMPLATES.find((t) => t.patch.rotateZ === undefined && t.patch.vfx === undefined)!
    const next = applyTemplate(cluttered, template)
    expect(next.vfx).toBe('none')
    expect(next.watermarkEnabled).toBe(false)
    expect(next.rotateZ).toBe(0)
  })
})
