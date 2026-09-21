import { describe, it, expect } from 'vitest'
import {
  ARRANGEMENTS,
  applyDrag,
  isTap,
  arrangementsFor,
  padFromTilt,
  resolveSlots,
  setDeviceCount,
  tiltFromPad,
  BACKGROUND_CATEGORIES,
  BACKGROUNDS,
  BORDERS,
  DEFAULT_MOCKUP_STATE,
  DEVICE_CATEGORIES,
  DEVICES,
  EXPORT_FORMATS,
  EXPORT_SCALES,
  LAYOUTS,
  SCENES,
  SHADOW_MODES,
  SIZE_GROUPS,
  STYLES,
  applyLayout,
  applyLook,
  buildLightOverlay,
  buildShadow,
  buildTransform,
  clampNumber,
  exportFileName,
  findDevice,
  findSize,
  fitMockupWidth,
  formatResolution,
  formatScreen,
  hexToRgba,
  mockupAspect,
  qualityLabel,
  resolveBackground,
  resolveOutputSize,
  resolvePixelRatio,
} from '../mockup'

const ctx = { customColor: '#ff0000', imageUrl: null, magic: [] }

describe('clampNumber', () => {
  it('keeps a value already inside the range', () => {
    expect(clampNumber(5, 0, 10)).toBe(5)
  })

  it('clamps below the minimum and above the maximum', () => {
    expect(clampNumber(-3, 0, 10)).toBe(0)
    expect(clampNumber(42, 0, 10)).toBe(10)
  })

  // A slider bound to a text input can emit NaN; falling back to the minimum
  // keeps the canvas rendering instead of collapsing to an invalid transform.
  it('falls back to the minimum when the value is not a number', () => {
    expect(clampNumber(Number.NaN, 2, 10)).toBe(2)
  })
})

describe('buildTransform', () => {
  // Emitting "none" instead of a zeroed matrix keeps the export free of the
  // subpixel blur that a 3D transform forces even at zero degrees.
  it('returns none when there is no rotation', () => {
    expect(buildTransform({ rotateX: 0, rotateY: 0, rotateZ: 0, perspective: 1000 })).toBe('none')
  })

  it('composes perspective with every rotation axis', () => {
    expect(buildTransform({ rotateX: 12, rotateY: -8, rotateZ: 3, perspective: 1400 })).toBe(
      'perspective(1400px) rotateX(12deg) rotateY(-8deg) rotateZ(3deg)',
    )
  })
})

describe('hexToRgba', () => {
  it('converts a six digit hex colour', () => {
    expect(hexToRgba('#22d3ee', 0.5)).toBe('rgba(34, 211, 238, 0.5)')
  })

  it('expands the three digit shorthand', () => {
    expect(hexToRgba('#fff', 1)).toBe('rgba(255, 255, 255, 1)')
  })

  it('falls back to black for an invalid colour', () => {
    expect(hexToRgba('nope', 0.3)).toBe('rgba(0, 0, 0, 0.3)')
  })
})

describe('buildShadow', () => {
  it('returns none for the none mode whatever the opacity', () => {
    expect(buildShadow('none', 100, null)).toBe('none')
  })

  it('returns none at zero opacity', () => {
    expect(buildShadow('spread', 0, null)).toBe('none')
  })

  it('renders hug tighter than spread at the same opacity', () => {
    expect(buildShadow('hug', 50, null)).not.toBe(buildShadow('spread', 50, null))
  })

  // Adaptive tints the shadow with the screenshot's dominant colour, the way a
  // bright screen would spill light onto the surface under it.
  it('tints the adaptive shadow with the given colour', () => {
    expect(buildShadow('adaptive', 50, '#ff0000')).toContain('rgba(255, 0, 0,')
  })

  it('degrades adaptive to a neutral shadow when there is no colour yet', () => {
    expect(buildShadow('adaptive', 50, null)).toContain('rgba(0, 0, 0,')
  })

  // The preview is smaller than the exported canvas; scaling the lengths keeps
  // the shadow proportional to the mockup at any preview size.
  it('scales every length by the given factor', () => {
    expect(buildShadow('hug', 50, null, 1)).toBe('0px 8px 17px rgba(0, 0, 0, 0.5)')
    expect(buildShadow('hug', 50, null, 0.5)).toBe('0px 4px 8.5px rgba(0, 0, 0, 0.5)')
  })
})

describe('buildLightOverlay', () => {
  it('returns none at zero intensity', () => {
    expect(buildLightOverlay(135, 0)).toBe('none')
  })

  it('angles a white highlight across the screen', () => {
    expect(buildLightOverlay(120, 50)).toMatch(/^linear-gradient\(120deg, rgba\(255, 255, 255, /)
  })
})

describe('resolveBackground', () => {
  it('resolves a catalogue preset to its css value', () => {
    const preset = BACKGROUNDS.find((b) => b.id !== 'transparent')!
    expect(resolveBackground(preset.id, ctx)).toBe(preset.css)
  })

  it('uses the custom colour for the color background', () => {
    expect(resolveBackground('color', ctx)).toBe('#ff0000')
  })

  // Transparent exports need a real "no paint" value, not a white rectangle.
  it('resolves transparent to a transparent value', () => {
    expect(resolveBackground('transparent', ctx)).toBe('transparent')
  })

  it('covers the canvas with the uploaded background image', () => {
    expect(resolveBackground('image', { ...ctx, imageUrl: 'data:image/png;base64,AAA' })).toBe(
      'url("data:image/png;base64,AAA") center / cover no-repeat',
    )
  })

  it('resolves a magic background from the generated list', () => {
    const magic = [{ id: 'magic-0', label: 'Magic 1', css: 'linear-gradient(red, blue)' }]
    expect(resolveBackground('magic-0', { ...ctx, magic })).toBe('linear-gradient(red, blue)')
  })

  it('falls back to the first gradient when the id cannot be resolved', () => {
    expect(resolveBackground('image', ctx)).toBe(BACKGROUND_CATEGORIES[1].presets[0].css)
    expect(resolveBackground('magic-9', ctx)).toBe(BACKGROUND_CATEGORIES[1].presets[0].css)
    expect(resolveBackground('does-not-exist', ctx)).toBe(BACKGROUND_CATEGORIES[1].presets[0].css)
  })
})

describe('mockupAspect', () => {
  it('follows the image for the screenshot device', () => {
    expect(mockupAspect(findDevice('screenshot'), 2)).toBe(2)
  })

  it('uses the fixed screen ratio of a phone, widened by its bezel', () => {
    const phone = findDevice('iphone-17')
    const screenRatio = 402 / 874
    const aspect = mockupAspect(phone, 2)
    expect(aspect).toBeGreaterThan(screenRatio)
    expect(aspect).toBeLessThan(screenRatio * 1.2)
  })

  // A laptop is wider than its screen: the base sticks out past the lid.
  it('makes a laptop wider than its bare screen', () => {
    const laptop = findDevice('macbook-pro-16')
    expect(mockupAspect(laptop, 1)).toBeGreaterThan(3456 / 2234)
  })

  it('falls back to 16:10 when an adaptive device has no image yet', () => {
    expect(mockupAspect(findDevice('screenshot'), null)).toBeCloseTo(16 / 10)
  })
})

describe('fitMockupWidth', () => {
  it('fills the width with a mockup wider than the canvas', () => {
    expect(fitMockupWidth({ canvasAspect: 4 / 3, mockupAspect: 2, zoom: 100 })).toBe(100)
  })

  // A tall phone on a landscape canvas must shrink so its height still fits.
  it('narrows a tall mockup so its height fits the canvas', () => {
    expect(fitMockupWidth({ canvasAspect: 2, mockupAspect: 0.5, zoom: 100 })).toBe(25)
  })

  it('scales the fitted width by the zoom', () => {
    expect(fitMockupWidth({ canvasAspect: 4 / 3, mockupAspect: 2, zoom: 80 })).toBe(80)
  })
})

describe('sizes', () => {
  it('resolves a size preset by id', () => {
    expect(findSize('4:3')).toMatchObject({ width: 1920, height: 1440 })
  })

  it('includes the social presets', () => {
    expect(findSize('instagram-story')).toMatchObject({ width: 1080, height: 1920 })
    expect(findSize('twitter-cover')).toMatchObject({ width: 1500, height: 500 })
  })

  it('returns undefined for an unknown size', () => {
    expect(findSize('nope')).toBeUndefined()
  })

  it('includes the Pinterest, Dribbble and App Store presets of shots.so', () => {
    expect(findSize('pinterest-long')).toMatchObject({ width: 1000, height: 2100 })
    expect(findSize('dribbble-shot')).toMatchObject({ width: 1600, height: 1200 })
    expect(findSize('appstore-iphone-65')).toMatchObject({ width: 1284, height: 2778 })
    expect(findSize('appstore-iphone-65-landscape')).toMatchObject({ width: 2778, height: 1284 })
    expect(findSize('youtube-video')).toMatchObject({ width: 1920, height: 1080 })
  })
})

describe('device catalogue', () => {
  it('uses the screen sizes shots.so lists', () => {
    expect(findDevice('ipad-pro-13').screen).toEqual({ width: 2048, height: 2732 })
    expect(findDevice('pixel-7-pro').screen).toEqual({ width: 720, height: 1560 })
    expect(findDevice('watch-10-42').screen).toEqual({ width: 374, height: 446 })
    expect(findDevice('pro-display-xdr').screen).toEqual({ width: 6016, height: 3384 })
  })

  // iPhone 14 and 14 Plus kept the notch; the Pro models got the island.
  it('draws the notch on the phones that still have one', () => {
    expect(findDevice('iphone-14').cutout).toBe('notch')
    expect(findDevice('iphone-14-pro').cutout).toBe('island')
  })

  it('offers an adaptive minimal desktop among the essentials', () => {
    const minimal = findDevice('minimal-desktop')
    expect(minimal.category).toBe('essentials')
    expect(minimal.screen).toBeNull()
    expect(mockupAspect(minimal, 16 / 9)).toBeLessThan(16 / 9)
  })

  it('groups phones into the shots.so series', () => {
    const series = new Set(DEVICES.filter((d) => d.category === 'phone').map((d) => d.series))
    expect(series).toEqual(new Set(['iPhone 17', 'iPhone 16 y anteriores', 'Android']))
  })
})

describe('background catalogue', () => {
  const count = (id: string) => BACKGROUND_CATEGORIES.find((c) => c.id === id)?.presets.length ?? 0

  it('adds the Radiant and Texture categories', () => {
    expect(count('radiant')).toBeGreaterThanOrEqual(12)
    expect(count('texture')).toBeGreaterThanOrEqual(10)
  })

  it('offers as many options per category as shots.so, roughly', () => {
    expect(count('solid')).toBeGreaterThanOrEqual(24)
    expect(count('gradient')).toBeGreaterThanOrEqual(20)
    expect(count('glass')).toBeGreaterThanOrEqual(12)
    expect(count('cosmic')).toBeGreaterThanOrEqual(11)
    expect(count('mystic')).toBeGreaterThanOrEqual(14)
  })
})

describe('export helpers', () => {
  it('multiplies the canvas size by the export scale', () => {
    expect(resolveOutputSize(1920, 1440, 2)).toEqual({ width: 3840, height: 2880 })
  })

  it('scales a rendered node up to the requested output width', () => {
    expect(resolvePixelRatio(960, 1920)).toBe(2)
  })

  // A node measured before layout would otherwise produce Infinity.
  it('falls back to one when the node has no width', () => {
    expect(resolvePixelRatio(0, 1920)).toBe(1)
  })

  it('labels output widths the way the export menu shows them', () => {
    expect(qualityLabel(1920)).toBe('FHD')
    expect(qualityLabel(3840)).toBe('4K')
    expect(qualityLabel(5760)).toBe('6K')
    expect(qualityLabel(1080)).toBe('HD')
  })

  it('renders a size as a readable label', () => {
    expect(formatResolution({ width: 1920, height: 1440 })).toBe('1920 × 1440')
  })

  it('describes a device screen or its adaptive behaviour', () => {
    expect(formatScreen(findDevice('iphone-17'))).toBe('402 × 874')
    expect(formatScreen(findDevice('screenshot'))).toBe('Se adapta a la imagen')
  })

  it('builds a sortable timestamped name with the chosen extension', () => {
    const date = new Date(2026, 8, 21, 14, 5, 9)
    expect(exportFileName(date, 'png')).toBe('mockup-2026-09-21-140509.png')
    expect(exportFileName(date, 'jpeg')).toBe('mockup-2026-09-21-140509.jpg')
    expect(exportFileName(date, 'webp')).toBe('mockup-2026-09-21-140509.webp')
  })
})

describe('looks and layouts', () => {
  it('merges a look patch over the state', () => {
    const next = applyLook(DEFAULT_MOCKUP_STATE, { id: 'test', label: 'Test', patch: { styleId: 'border', zoom: 64 } })
    expect(next.styleId).toBe('border')
    expect(next.zoom).toBe(64)
    expect(next.width).toBe(DEFAULT_MOCKUP_STATE.width)
  })

  it('applies a layout to the position and rotation only', () => {
    const layout = LAYOUTS[1]
    const next = applyLayout(DEFAULT_MOCKUP_STATE, layout)
    expect(next.rotateY).toBe(layout.rotateY)
    expect(next.zoom).toBe(layout.zoom)
    expect(next.backgroundId).toBe(DEFAULT_MOCKUP_STATE.backgroundId)
  })
})

describe('multi-device arrangements', () => {
  it('places a single device alone, centred and untransformed', () => {
    expect(resolveSlots(1, 'anything')).toEqual([{ x: 0, y: 0, scale: 1, rotateX: 0, rotateY: 0, rotateZ: 0 }])
  })

  it('gives every arrangement exactly as many slots as devices it holds', () => {
    expect(ARRANGEMENTS.every((a) => a.slots.length === a.count)).toBe(true)
  })

  it('offers arrangements for two and for three devices', () => {
    expect(arrangementsFor(2).length).toBeGreaterThan(0)
    expect(arrangementsFor(3).length).toBeGreaterThan(0)
    expect(arrangementsFor(2).every((a) => a.count === 2)).toBe(true)
  })

  it('resolves the chosen arrangement for the current count', () => {
    const [first, second] = arrangementsFor(2)
    expect(resolveSlots(2, second.id)).toEqual(second.slots)
    expect(resolveSlots(2, first.id)).toEqual(first.slots)
  })

  // Switching from 3 to 2 devices must not keep a 3-slot arrangement around.
  it('falls back to the first arrangement of the count when the id belongs to another count', () => {
    const trio = arrangementsFor(3)[0]
    expect(resolveSlots(2, trio.id)).toEqual(arrangementsFor(2)[0].slots)
  })

  it('switches the device count and resets the arrangement', () => {
    const next = setDeviceCount(DEFAULT_MOCKUP_STATE, 3)
    expect(next.count).toBe(3)
    expect(next.arrangementId).toBe(arrangementsFor(3)[0].id)
  })
})

describe('drag interactions', () => {
  const start = { offsetX: 0, offsetY: 0, rotateX: 0, rotateY: 0 }
  const size = { width: 1000, height: 500 }

  it('moves the composition by the dragged fraction of the canvas in zoom mode', () => {
    expect(applyDrag('zoom', start, 100, 50, size)).toEqual({ offsetX: 10, offsetY: 10 })
  })

  it('clamps the offset so the composition cannot be dragged away entirely', () => {
    expect(applyDrag('zoom', start, 5000, -5000, size)).toEqual({ offsetX: 50, offsetY: -50 })
  })

  // Dragging right turns the face towards the right; dragging up tips it back.
  it('tilts around Y for horizontal drags and around X for vertical ones', () => {
    const patch = applyDrag('tilt', start, 250, -125, size)
    expect(patch.rotateY).toBe(30)
    expect(patch.rotateX).toBe(30)
  })

  it('clamps the tilt to the supported range', () => {
    expect(applyDrag('tilt', start, 99999, 99999, size)).toEqual({ rotateX: -60, rotateY: 60 })
  })

  // "Hold ⇧ for precision": the same hand movement moves a quarter as much.
  it('slows the gesture down to a quarter in precision mode', () => {
    expect(applyDrag('tilt', start, 250, 0, size, { precision: true }).rotateY).toBe(8)
    expect(applyDrag('zoom', start, 400, 0, size, { precision: true }).offsetX).toBe(10)
  })

  it('adds the drag to where the gesture started', () => {
    expect(applyDrag('tilt', { ...start, rotateY: 10 }, 100, 0, size).rotateY).toBe(22)
  })

  // A click on the canvas and the start of a drag begin the same way; only the
  // distance travelled tells them apart.
  it('treats a press that barely moves as a tap, not a drag', () => {
    expect(isTap(0, 0)).toBe(true)
    expect(isTap(2, -3)).toBe(true)
    expect(isTap(6, 0)).toBe(false)
    expect(isTap(3, 3)).toBe(false)
  })

  it('maps a point on the tilt pad to a rotation and back', () => {
    expect(tiltFromPad(0.5, 0.5)).toEqual({ rotateX: 0, rotateY: 0 })
    expect(tiltFromPad(1, 0)).toEqual({ rotateX: 60, rotateY: 60 })
    expect(padFromTilt(60, 60)).toEqual({ x: 1, y: 0 })
    expect(padFromTilt(0, 0)).toEqual({ x: 0.5, y: 0.5 })
  })
})

describe('catalogues', () => {
  const unique = (ids: string[]) => new Set(ids).size === ids.length

  it('exposes unique ids in every catalogue', () => {
    expect(unique(BACKGROUNDS.map((b) => b.id))).toBe(true)
    expect(unique(DEVICES.map((d) => d.id))).toBe(true)
    expect(unique(SIZE_GROUPS.flatMap((g) => g.sizes.map((s) => s.id)))).toBe(true)
  })

  it('gives every device at least one colour variant', () => {
    expect(DEVICES.every((d) => d.variants.length > 0)).toBe(true)
  })

  it('files every device under a known category', () => {
    const categories = DEVICE_CATEGORIES.map((c) => c.id)
    expect(DEVICES.every((d) => categories.includes(d.category))).toBe(true)
  })

  it('mirrors the shots.so option sets', () => {
    expect(STYLES.map((s) => s.id)).toEqual([
      'default', 'glass-light', 'glass-dark', 'liquid', 'inset-light', 'inset-dark', 'outline', 'border',
      'retro', 'card', 'stack', 'stack-2',
    ])
    expect(BORDERS.map((b) => b.id)).toEqual(['sharp', 'curved', 'round'])
    expect(SHADOW_MODES.map((s) => s.id)).toEqual(['none', 'spread', 'hug', 'adaptive'])
    expect(SCENES.map((s) => s.id)).toEqual(['none', 'shadow', 'shapes'])
  })

  // Every format and scale is free here: this editor has no paid tier.
  it('offers every export format and scale', () => {
    expect(EXPORT_FORMATS.map((f) => f.id)).toEqual(['png', 'jpeg', 'webp'])
    expect(EXPORT_SCALES).toEqual([1, 2, 3])
  })

  it('starts from a state that points at real catalogue entries', () => {
    const device = findDevice(DEFAULT_MOCKUP_STATE.deviceId)
    expect(device.id).toBe(DEFAULT_MOCKUP_STATE.deviceId)
    expect(device.variants.some((v) => v.id === DEFAULT_MOCKUP_STATE.variantId)).toBe(true)
    expect(findSize(DEFAULT_MOCKUP_STATE.sizeId)).toBeDefined()
    expect(BACKGROUNDS.some((b) => b.id === DEFAULT_MOCKUP_STATE.backgroundId)).toBe(true)
  })

  it('falls back to the screenshot device for an unknown id', () => {
    expect(findDevice('nope').id).toBe('screenshot')
  })
})
