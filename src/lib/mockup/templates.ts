// Templates: complete one-click compositions, grouped like the shots.so
// gallery. Each one is a patch over the default state, so anything it does
// not mention starts clean.

import { DEFAULT_MOCKUP_STATE, type MockupState } from './state'

export type TemplateCategoryId = 'promo' | 'desktop' | 'shadow' | 'showcase'

export const TEMPLATE_CATEGORIES: { id: TemplateCategoryId; label: string }[] = [
  { id: 'promo', label: 'Product promotion' },
  { id: 'desktop', label: 'Realistic Desktop' },
  { id: 'shadow', label: 'Shadow Overlays' },
  { id: 'showcase', label: 'UI Showcase' },
]

/** Settings a template never touches: they belong to the export, not the look. */
type TemplatePatch = Partial<Omit<MockupState, 'exportFormat' | 'exportScale'>>

export type Template = {
  id: string
  label: string
  category: TemplateCategoryId
  patch: TemplatePatch
}

export const TEMPLATES: Template[] = [
  // Product promotion — bold, angled hero shots on dark, glowing backdrops.
  {
    id: 'promo-screenshot',
    label: 'Screenshot',
    category: 'promo',
    patch: { deviceId: 'screenshot', variantId: 'default', backgroundId: 'cosmic-5', rotateX: 22, rotateY: -20, rotateZ: 10, zoom: 118, offsetX: 10, offsetY: 6, shadowMode: 'adaptive', shadowOpacity: 60, radius: 20 },
  },
  {
    id: 'promo-ipad',
    label: 'iPad Pro 13',
    category: 'promo',
    patch: { deviceId: 'ipad-pro-13', variantId: 'black', backgroundId: 'glass-10', rotateX: 12, rotateY: 16, rotateZ: -4, zoom: 88, shadowMode: 'spread', shadowOpacity: 55 },
  },
  {
    id: 'promo-macbook',
    label: 'MacBook Pro 16',
    category: 'promo',
    patch: { deviceId: 'macbook-pro-16', variantId: 'black', backgroundId: 'cosmic-9', rotateX: 16, rotateY: -12, zoom: 92, shadowMode: 'adaptive', shadowOpacity: 50, lightIntensity: 25 },
  },

  // Realistic Desktop — browser windows on macOS-like wallpapers.
  {
    id: 'desktop-browser-dark',
    label: 'Browser',
    category: 'desktop',
    patch: { deviceId: 'browser', variantId: 'dark', backgroundId: 'desktop-1', zoom: 84, shadowMode: 'spread', shadowOpacity: 45, radius: 14 },
  },
  {
    id: 'desktop-browser-light',
    label: 'Browser',
    category: 'desktop',
    patch: { deviceId: 'browser', variantId: 'light', backgroundId: 'desktop-2', zoom: 82, shadowMode: 'spread', shadowOpacity: 40, radius: 14 },
  },
  {
    id: 'desktop-imac',
    label: 'iMac 24',
    category: 'desktop',
    patch: { deviceId: 'imac-24', variantId: 'blue', backgroundId: 'desktop-8', zoom: 80, shadowMode: 'spread', shadowOpacity: 45 },
  },

  // Shadow Overlays — phones on pale surfaces under window light and foliage.
  {
    id: 'shadow-duo',
    label: 'iPhone 16 Plus',
    category: 'shadow',
    patch: { deviceId: 'iphone-16-plus', variantId: 'black', count: 2, arrangementId: 'duo-diagonal', backgroundId: 'solid-2', sceneId: 'shadow', sceneShadowId: 'leaves', sceneOpacity: 55, sceneLayer: 'overlay', zoom: 92 },
  },
  {
    id: 'shadow-iphone',
    label: 'iPhone 16',
    category: 'shadow',
    patch: { deviceId: 'iphone-16', variantId: 'white', backgroundId: 'solid-3', sceneId: 'shadow', sceneShadowId: 'monstera', sceneOpacity: 60, sceneLayer: 'overlay', zoom: 78 },
  },
  {
    id: 'shadow-trio',
    label: 'iPhone 16 Pro Max',
    category: 'shadow',
    patch: { deviceId: 'iphone-16-pro-max', variantId: 'black', count: 3, arrangementId: 'trio-row', backgroundId: 'solid-1', sceneId: 'shadow', sceneShadowId: 'palm', sceneOpacity: 50, sceneLayer: 'overlay', zoom: 88 },
  },
  {
    id: 'shadow-ipad',
    label: 'iPad Pro 13',
    category: 'shadow',
    patch: { deviceId: 'ipad-pro-13', variantId: 'black', backgroundId: 'solid-4', sceneId: 'shadow', sceneShadowId: 'blinds', sceneOpacity: 55, sceneLayer: 'overlay', rotateZ: -6, zoom: 80 },
  },
  {
    id: 'shadow-screenshot',
    label: 'Screenshot',
    category: 'shadow',
    patch: { deviceId: 'screenshot', variantId: 'default', backgroundId: 'solid-3', sceneId: 'shadow', sceneShadowId: 'foliage', sceneOpacity: 60, sceneLayer: 'underlay', zoom: 76, radius: 16 },
  },

  // UI Showcase — clean, bright, product-first layouts.
  {
    id: 'showcase-iphone',
    label: 'iPhone 16 Pro',
    category: 'showcase',
    patch: { deviceId: 'iphone-16-pro', variantId: 'black', backgroundId: 'solid-1', shadowMode: 'spread', shadowOpacity: 35, zoom: 80 },
  },
  {
    id: 'showcase-angled',
    label: 'iPhone 16 Pro',
    category: 'showcase',
    patch: { deviceId: 'iphone-16-pro', variantId: 'white', backgroundId: 'solid-3', rotateY: -28, rotateX: 6, zoom: 84, offsetX: 6, shadowMode: 'spread', shadowOpacity: 40 },
  },
  {
    id: 'showcase-card',
    label: 'Screenshot',
    category: 'showcase',
    patch: { deviceId: 'screenshot', variantId: 'default', styleId: 'card', backgroundId: 'solid-2', zoom: 74, shadowMode: 'hug', shadowOpacity: 30, radius: 14 },
  },
  {
    id: 'showcase-duo-dark',
    label: 'iPhone 16',
    category: 'showcase',
    patch: { deviceId: 'iphone-16', variantId: 'white', count: 2, arrangementId: 'duo-tilt', backgroundId: 'solid-8', zoom: 90, shadowMode: 'spread', shadowOpacity: 55 },
  },
  {
    id: 'showcase-trio',
    label: 'iPhone 16',
    category: 'showcase',
    patch: { deviceId: 'iphone-16', variantId: 'black', count: 3, arrangementId: 'trio-fan', backgroundId: 'solid-1', zoom: 92, shadowMode: 'spread', shadowOpacity: 40 },
  },
]

/**
 * Starts from the defaults so nothing from the previous look leaks in, then
 * applies the template, keeping only the user's export choices and canvas size.
 */
export function applyTemplate(state: MockupState, template: Template): MockupState {
  return {
    ...DEFAULT_MOCKUP_STATE,
    sizeId: state.sizeId,
    width: state.width,
    height: state.height,
    exportFormat: state.exportFormat,
    exportScale: state.exportScale,
    ...template.patch,
  }
}
