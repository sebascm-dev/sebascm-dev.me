// Pure functions that turn the editor state into CSS values and numbers.

import {
  BACKGROUNDS,
  BACKGROUND_CATEGORIES,
  type BackgroundPreset,
  type DevicePreset,
  type ExportFormat,
  type ShadowMode,
} from './catalog'
import type { MockupState } from './state'

/**
 * Device proportions as fractions of the device's own width. The frame
 * components draw with these same numbers (as `cqw` units), which is what keeps
 * `mockupAspect` in step with what actually ends up on screen.
 */
export const GEOMETRY = {
  browserBar: 0.04,
  phoneBezel: 0.035,
  tabletBezel: 0.03,
  watchBezel: 0.08,
  watchBand: 0.3,
  laptopLid: 0.84,
  laptopBezel: 0.03,
  laptopBase: 0.035,
  desktopBezel: 0.03,
  desktopChin: 0.1,
  desktopStand: 0.18,
  monitorBezel: 0.018,
  monitorNeck: 0.07,
  monitorFoot: 0.018,
} as const

/** Used by adaptive devices before an image has been dropped in. */
const PLACEHOLDER_ASPECT = 16 / 10

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

export function hexToRgba(hex: string, alpha: number): string {
  let value = hex.trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(value)) value = value.split('').map((c) => c + c).join('')
  if (!/^[0-9a-f]{6}$/i.test(value)) return `rgba(0, 0, 0, ${alpha})`
  const n = parseInt(value, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

/**
 * A zeroed 3D transform still forces the browser onto a composited layer, and
 * that resampling shows up as blur in the export — so no rotation means none.
 */
export function buildTransform({
  rotateX,
  rotateY,
  rotateZ,
  perspective,
}: Pick<MockupState, 'rotateX' | 'rotateY' | 'rotateZ' | 'perspective'>): string {
  if (rotateX === 0 && rotateY === 0 && rotateZ === 0) return 'none'
  return `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`
}

/**
 * @param adaptiveColor Dominant colour of the screenshot, used by the adaptive
 *   mode; null until an image has been analysed.
 * @param scale Multiplier for every length, so a preview drawn smaller than the
 *   final canvas keeps the same proportions as the exported file.
 */
export function buildShadow(
  mode: ShadowMode,
  opacity: number,
  adaptiveColor: string | null,
  scale = 1,
): string {
  if (mode === 'none' || opacity <= 0) return 'none'
  const alpha = Number(Math.min(0.75, opacity / 100).toFixed(2))
  const px = (factor: number) => Math.round(opacity * factor * scale * 10) / 10

  switch (mode) {
    case 'hug':
      return `0px ${px(0.16)}px ${px(0.34)}px rgba(0, 0, 0, ${alpha})`
    case 'adaptive':
      if (adaptiveColor) {
        return `0px ${px(0.4)}px ${px(1.4)}px ${px(0.05)}px ${hexToRgba(adaptiveColor, Math.min(0.9, alpha * 1.4))}`
      }
      return `0px ${px(0.5)}px ${px(1.2)}px 0px rgba(0, 0, 0, ${alpha})`
    default:
      return `0px ${px(0.5)}px ${px(1.2)}px -${px(0.12)}px rgba(0, 0, 0, ${alpha})`
  }
}

/** A glossy highlight laid over the screen, like light catching the glass. */
export function buildLightOverlay(angle: number, intensity: number): string {
  if (intensity <= 0) return 'none'
  const alpha = Number(((intensity / 100) * 0.5).toFixed(2))
  return `linear-gradient(${angle}deg, rgba(255, 255, 255, ${alpha}) 0%, rgba(255, 255, 255, 0) 45%, rgba(255, 255, 255, 0) 100%)`
}

export type BackgroundContext = {
  customColor: string
  /** Data URL of the uploaded background image, if any. */
  imageUrl: string | null
  /** Backgrounds generated from the screenshot's palette. */
  magic: BackgroundPreset[]
}

export function resolveBackground(backgroundId: string, ctx: BackgroundContext): string {
  const fallback = BACKGROUND_CATEGORIES[1].presets[0].css

  if (backgroundId === 'transparent') return 'transparent'
  if (backgroundId === 'color') return ctx.customColor
  if (backgroundId === 'image') {
    return ctx.imageUrl ? `url("${ctx.imageUrl}") center / cover no-repeat` : fallback
  }
  if (backgroundId.startsWith('magic-')) {
    return ctx.magic.find((m) => m.id === backgroundId)?.css ?? fallback
  }
  return BACKGROUNDS.find((b) => b.id === backgroundId)?.css ?? fallback
}

/**
 * Overall width / height of a device, frame included.
 *
 * @param imageAspect Width / height of the screenshot, used by the devices that
 *   adapt to their media; null while the canvas is still empty.
 */
export function mockupAspect(device: DevicePreset, imageAspect: number | null): number {
  const media = imageAspect ?? PLACEHOLDER_ASPECT
  const screen = device.screen ? device.screen.width / device.screen.height : media
  const g = GEOMETRY

  switch (device.kind) {
    case 'screenshot':
      return media
    case 'browser':
      return 1 / (1 / media + g.browserBar)
    case 'monitor':
      return 1 / ((1 - 2 * g.monitorBezel) / media + 2 * g.monitorBezel + g.monitorNeck + g.monitorFoot)
    case 'phone':
      return 1 / ((1 - 2 * g.phoneBezel) / screen + 2 * g.phoneBezel)
    case 'tablet':
      return 1 / ((1 - 2 * g.tabletBezel) / screen + 2 * g.tabletBezel)
    case 'watch':
      return 1 / ((1 - 2 * g.watchBezel) / screen + 2 * g.watchBezel + 2 * g.watchBand)
    case 'laptop': {
      const lidScreenWidth = g.laptopLid * (1 - 2 * g.laptopBezel)
      const lidHeight = lidScreenWidth / screen + 2 * g.laptopLid * g.laptopBezel
      return 1 / (lidHeight + g.laptopBase)
    }
    case 'desktop': {
      const chin = device.chin ?? g.desktopChin
      const screenHeight = (1 - 2 * g.desktopBezel) / screen
      return 1 / (g.desktopBezel + screenHeight + chin + g.desktopStand)
    }
  }
}

/**
 * Width of the mockup as a percentage of the canvas width, such that the whole
 * mockup fits inside the canvas at zoom 100 and scales linearly from there.
 */
export function fitMockupWidth({
  canvasAspect,
  mockupAspect,
  zoom,
}: {
  canvasAspect: number
  mockupAspect: number
  zoom: number
}): number {
  const fraction = mockupAspect >= canvasAspect ? 1 : mockupAspect / canvasAspect
  return Math.round(fraction * zoom * 100) / 100
}

export function resolveOutputSize(width: number, height: number, scale: number) {
  return { width: width * scale, height: height * scale }
}

/**
 * html-to-image scales the rendered node by a pixel ratio, so the ratio is
 * whatever turns the on-screen width into the requested output width.
 */
export function resolvePixelRatio(nodeWidth: number, targetWidth: number): number {
  if (!nodeWidth || !Number.isFinite(nodeWidth)) return 1
  return targetWidth / nodeWidth
}

export function qualityLabel(outputWidth: number): string {
  if (outputWidth >= 5000) return '6K'
  if (outputWidth >= 3000) return '4K'
  if (outputWidth >= 1800) return 'FHD'
  return 'HD'
}

export function formatResolution(size: { width: number; height: number }): string {
  return `${size.width} × ${size.height}`
}

export function formatScreen(device: DevicePreset): string {
  return device.screen ? formatResolution(device.screen) : 'Se adapta a la imagen'
}

export function exportFileName(date: Date, format: ExportFormat): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp =
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  return `mockup-${stamp}.${format === 'jpeg' ? 'jpg' : format}`
}
