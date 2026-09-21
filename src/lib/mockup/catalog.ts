// Everything the editor can pick from. Plain data only — rendering decisions
// live in render.ts and the React components.

export type DeviceKind =
  | 'screenshot'
  | 'browser'
  | 'monitor'
  | 'phone'
  | 'tablet'
  | 'laptop'
  | 'desktop'
  | 'watch'
export type DeviceCategoryId = 'essentials' | 'phone' | 'tablet' | 'laptop' | 'desktop' | 'watch'
export type StyleId =
  | 'default'
  | 'glass-light'
  | 'glass-dark'
  | 'liquid'
  | 'inset-light'
  | 'inset-dark'
  | 'outline'
  | 'border'
  | 'retro'
  | 'card'
  | 'stack'
  | 'stack-2'
export type BorderId = 'sharp' | 'curved' | 'round'
export type ShadowMode = 'none' | 'spread' | 'hug' | 'adaptive'
export type SceneId = 'none' | 'shadow' | 'shapes'
export type ExportFormat = 'png' | 'jpeg' | 'webp'

export type DeviceVariant = {
  id: string
  label: string
  /** Main body colour; the frame derives its metallic shading from it. */
  color: string
}

export type DevicePreset = {
  id: string
  label: string
  category: DeviceCategoryId
  /** Heading the device is listed under inside its category, e.g. a phone series. */
  series?: string
  kind: DeviceKind
  /** Screen size in points, or null when the device adapts to the image. */
  screen: { width: number; height: number } | null
  variants: DeviceVariant[]
  isNew?: boolean
  /** Front camera cut-out on phones. */
  cutout?: 'island' | 'notch' | 'punch'
  /** Desktop chin height as a fraction of the width; defaults to the iMac chin. */
  chin?: number
  /** Desktop front bezel colour; the iMac 24 is light, pro displays are dark. */
  bezel?: 'light' | 'dark'
}

/** How a background reads, so presets can pair it with a contrasting screenshot. */
export type BackgroundTone = 'dark' | 'light' | 'vivid'

export type BackgroundPreset = {
  id: string
  label: string
  /** Any value valid for the CSS `background` shorthand. */
  css: string
  tone?: BackgroundTone
  /** Magic backgrounds only: the row they are listed under in the panel. */
  group?: string
}

export type BackgroundCategory = {
  id: string
  label: string
  presets: BackgroundPreset[]
}

export type SizePreset = {
  id: string
  label: string
  /** Secondary line under the label, e.g. the ratio of a social preset. */
  hint?: string
  width: number
  height: number
}

export type SizeGroup = {
  id: string
  label: string
  sizes: SizePreset[]
}

export const DEVICE_CATEGORIES: { id: DeviceCategoryId; label: string }[] = [
  { id: 'essentials', label: 'Esenciales' },
  { id: 'phone', label: 'Móvil' },
  { id: 'tablet', label: 'Tablets' },
  { id: 'laptop', label: 'Portátiles' },
  { id: 'desktop', label: 'Escritorio' },
  { id: 'watch', label: 'Relojes' },
]

// ─── Devices ────────────────────────────────────────────────────────────────

const v = (id: string, label: string, color: string): DeviceVariant => ({ id, label, color })

const SILVER = v('silver', 'Silver', '#d6d6d8')
const SPACE_BLACK = v('black', 'Space Black', '#2b2b2d')

const PRO_17 = [v('orange', 'Cosmic Orange', '#d9772b'), v('blue', 'Deep Blue', '#2c3e5a'), v('silver', 'Silver', '#d8d8da')]
const PRO_16 = [v('desert', 'Desert Titanium', '#bfa48f'), v('natural', 'Natural Titanium', '#b9b3a8'), v('white', 'White Titanium', '#e8e6e1'), v('black', 'Black Titanium', '#3a3a3c')]
const BASE_16 = [v('black', 'Black', '#1f1f21'), v('white', 'White', '#ececee'), v('ultramarine', 'Ultramarine', '#5667d8'), v('teal', 'Teal', '#8fc9c0'), v('pink', 'Pink', '#f2adc9')]
const BASE_15 = [v('pink', 'Pink', '#f5d4d8'), v('yellow', 'Yellow', '#f4e7a1'), v('green', 'Green', '#d5e3cf'), v('blue', 'Blue', '#cfdde8'), v('black', 'Black', '#35393b')]
const PRO_15 = [v('natural', 'Natural Titanium', '#bab4a9'), v('blue', 'Blue Titanium', '#3f4a5a'), v('white', 'White Titanium', '#e6e4df'), v('black', 'Black Titanium', '#3b3b3d')]
const BASE_14 = [v('blue', 'Blue', '#a7c1d9'), v('purple', 'Purple', '#d6cce6'), v('red', 'Red', '#c8102e'), v('midnight', 'Midnight', '#232a31'), v('starlight', 'Starlight', '#f0ebe3')]
const PRO_14 = [v('purple', 'Deep Purple', '#5b4e66'), v('gold', 'Gold', '#f3e3c3'), v('silver', 'Silver', '#e3e4df'), v('black', 'Space Black', '#403e3d')]

const phone = (
  id: string,
  label: string,
  series: string,
  width: number,
  height: number,
  variants: DeviceVariant[],
  extra: Partial<DevicePreset> = {},
): DevicePreset => ({ id, label, category: 'phone', series, kind: 'phone', screen: { width, height }, cutout: 'island', variants, ...extra })

const IPHONE_17 = 'iPhone 17'
const IPHONE_OLDER = 'iPhone 16 y anteriores'
const ANDROID = 'Android'

export const DEVICES: DevicePreset[] = [
  // Essentials
  { id: 'screenshot', label: 'Screenshot', category: 'essentials', kind: 'screenshot', screen: null, variants: [v('default', 'Default', '#ffffff')] },
  { id: 'browser', label: 'Navegador', category: 'essentials', kind: 'browser', screen: null, variants: [v('dark', 'Oscuro', '#1e1e1e'), v('light', 'Claro', '#f1f5f9')] },
  { id: 'minimal-desktop', label: 'Minimal Desktop', category: 'essentials', kind: 'monitor', screen: null, variants: [v('black', 'Negro', '#161616'), v('white', 'Blanco', '#f4f4f5')] },

  // iPhone 17 lineup
  phone('iphone-17', 'iPhone 17', IPHONE_17, 402, 874, [v('black', 'Black', '#1c1c1e'), v('white', 'White', '#e8e8ea'), v('lavender', 'Lavender', '#c8b8e8'), v('sage', 'Sage', '#b7c9b1'), v('mist', 'Mist Blue', '#9fb7d3')], { isNew: true }),
  phone('iphone-17-air', 'iPhone 17 Air', IPHONE_17, 420, 912, [v('black', 'Space Black', '#222224'), v('white', 'Cloud White', '#f0f0f0'), v('gold', 'Light Gold', '#e8d9b8'), v('sky', 'Sky Blue', '#bcd6ec')], { isNew: true }),
  phone('iphone-17-pro', 'iPhone 17 Pro', IPHONE_17, 402, 874, PRO_17, { isNew: true }),
  phone('iphone-17-pro-max', 'iPhone 17 Pro Max', IPHONE_17, 440, 956, PRO_17, { isNew: true }),

  // iPhone 16 & earlier
  phone('iphone-16', 'iPhone 16', IPHONE_OLDER, 393, 852, BASE_16),
  phone('iphone-16-plus', 'iPhone 16 Plus', IPHONE_OLDER, 430, 932, BASE_16),
  phone('iphone-16-pro', 'iPhone 16 Pro', IPHONE_OLDER, 402, 874, PRO_16),
  phone('iphone-16-pro-max', 'iPhone 16 Pro Max', IPHONE_OLDER, 440, 956, PRO_16),
  phone('iphone-15', 'iPhone 15', IPHONE_OLDER, 393, 852, BASE_15),
  phone('iphone-15-plus', 'iPhone 15 Plus', IPHONE_OLDER, 430, 932, BASE_15),
  phone('iphone-15-pro', 'iPhone 15 Pro', IPHONE_OLDER, 393, 852, PRO_15),
  phone('iphone-15-pro-max', 'iPhone 15 Pro Max', IPHONE_OLDER, 430, 932, PRO_15),
  phone('iphone-14', 'iPhone 14', IPHONE_OLDER, 390, 844, BASE_14, { cutout: 'notch' }),
  phone('iphone-14-plus', 'iPhone 14 Plus', IPHONE_OLDER, 428, 926, BASE_14, { cutout: 'notch' }),
  phone('iphone-14-pro', 'iPhone 14 Pro', IPHONE_OLDER, 393, 852, PRO_14),
  phone('iphone-14-pro-max', 'iPhone 14 Pro Max', IPHONE_OLDER, 430, 932, PRO_14),

  // Android
  phone('nothing-phone', 'Nothing Phone', ANDROID, 540, 1200, [v('white', 'White', '#f2f2f2'), v('black', 'Black', '#2a2a2a'), v('gray', 'Gray', '#8a8a8a')], { cutout: 'punch' }),
  phone('pixel-7-pro', 'Pixel 7 Pro', ANDROID, 720, 1560, [v('obsidian', 'Obsidian', '#202124'), v('snow', 'Snow', '#ece9e2'), v('hazel', 'Hazel', '#9aa38a'), v('porcelain', 'Porcelain', '#e8e1d6')], { cutout: 'punch' }),

  // Tablets
  { id: 'ipad-pro-13', label: 'iPad Pro 13', category: 'tablet', kind: 'tablet', screen: { width: 2048, height: 2732 }, variants: [SPACE_BLACK, SILVER, v('gray', 'Space Gray', '#5a5a5c')] },
  { id: 'ipad-pro-11', label: 'iPad Pro 11', category: 'tablet', kind: 'tablet', screen: { width: 1668, height: 2388 }, variants: [SPACE_BLACK, SILVER, v('gray', 'Space Gray', '#5a5a5c')] },
  { id: 'ipad-air', label: 'iPad Air', category: 'tablet', kind: 'tablet', screen: { width: 1640, height: 2360 }, variants: [v('gray', 'Space Gray', '#4a4a4c'), v('starlight', 'Starlight', '#e9e2d5'), v('blue', 'Blue', '#9db4cf'), v('purple', 'Purple', '#c9b6e4'), v('pink', 'Pink', '#e8c4cc')] },
  { id: 'ipad-mini', label: 'iPad Mini', category: 'tablet', kind: 'tablet', screen: { width: 1488, height: 2266 }, variants: [v('gray', 'Space Gray', '#4a4a4c'), v('starlight', 'Starlight', '#e9e2d5'), v('purple', 'Purple', '#c9b6e4'), v('pink', 'Pink', '#e8c4cc'), v('blue', 'Blue', '#9db4cf')] },

  // Laptops
  { id: 'macbook-pro-16', label: 'MacBook Pro 16', category: 'laptop', kind: 'laptop', screen: { width: 3456, height: 2234 }, variants: [SILVER, SPACE_BLACK] },
  { id: 'macbook-air-m2', label: 'MacBook Air M2', category: 'laptop', kind: 'laptop', screen: { width: 2560, height: 1664 }, variants: [v('midnight', 'Midnight', '#2e3642'), v('starlight', 'Starlight', '#e3dccf'), v('gray', 'Space Gray', '#7d7e80'), SILVER, v('sky', 'Sky Blue', '#b7cbe0')] },
  { id: 'macbook-air-13', label: 'MacBook Air 13', category: 'laptop', kind: 'laptop', screen: { width: 2560, height: 1600 }, variants: [SILVER, v('gray', 'Space Gray', '#7d7e80'), v('gold', 'Gold', '#e5cfb4'), v('rose', 'Rose Gold', '#e8c3b6')] },

  // Desktop
  { id: 'imac-24', label: 'iMac 24', category: 'desktop', kind: 'desktop', screen: { width: 4480, height: 2520 }, bezel: 'light', variants: [v('blue', 'Blue', '#4a78c2'), v('green', 'Green', '#5f9c6b'), v('pink', 'Pink', '#e38aa0'), v('purple', 'Purple', '#8e6bc4'), v('orange', 'Orange', '#e98b4a'), v('yellow', 'Yellow', '#f0c64a'), SILVER, v('red', 'Red', '#d9534f')] },
  { id: 'pro-display-xdr', label: 'Pro Display XDR', category: 'desktop', kind: 'desktop', screen: { width: 6016, height: 3384 }, chin: 0.03, bezel: 'dark', variants: [SILVER, v('gray', 'Space Gray', '#5a5a5c')] },
  { id: 'imac-pro', label: 'iMac Pro', category: 'desktop', kind: 'desktop', screen: { width: 5120, height: 2880 }, bezel: 'dark', variants: [v('gray', 'Space Gray', '#4a4a4d'), SILVER] },

  // Wearables
  { id: 'watch-ultra', label: 'Apple Watch Ultra', category: 'watch', kind: 'watch', screen: { width: 410, height: 502 }, variants: [v('natural', 'Natural', '#c9c3b8'), v('black', 'Black', '#2a2a2a'), v('orange', 'Orange Loop', '#e8692e'), v('green', 'Green Alpine', '#4c6b52'), v('blue', 'Blue Ocean', '#2f4f7f')] },
  { id: 'watch-10-46', label: 'Apple Watch 10 46mm', category: 'watch', kind: 'watch', screen: { width: 416, height: 496 }, variants: [v('black', 'Jet Black', '#1f1f1f'), v('rose', 'Rose Gold', '#e3b9a8'), SILVER] },
  { id: 'watch-10-42', label: 'Apple Watch 10 42mm', category: 'watch', kind: 'watch', screen: { width: 374, height: 446 }, variants: [v('rose', 'Rose Gold', '#e3b9a8'), v('black', 'Jet Black', '#1f1f1f'), SILVER] },
]

export const STYLES: { id: StyleId; label: string }[] = [
  { id: 'default', label: 'Default' },
  { id: 'glass-light', label: 'Glass Light' },
  { id: 'glass-dark', label: 'Glass Dark' },
  { id: 'liquid', label: 'Liquid' },
  { id: 'inset-light', label: 'Inset Light' },
  { id: 'inset-dark', label: 'Inset Dark' },
  { id: 'outline', label: 'Outline' },
  { id: 'border', label: 'Border' },
  { id: 'retro', label: 'Retro' },
  { id: 'card', label: 'Card' },
  { id: 'stack', label: 'Stack' },
  { id: 'stack-2', label: 'Stack 2' },
]

export const BORDERS: { id: BorderId; label: string; radius: number }[] = [
  { id: 'sharp', label: 'Sharp', radius: 0 },
  { id: 'curved', label: 'Curved', radius: 20 },
  { id: 'round', label: 'Round', radius: 40 },
]

export const SHADOW_MODES: { id: ShadowMode; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'spread', label: 'Spread' },
  { id: 'hug', label: 'Hug' },
  { id: 'adaptive', label: 'Adaptive' },
]

export const SCENES: { id: SceneId; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'shadow', label: 'Shadow' },
  { id: 'shapes', label: 'Shapes' },
]

export const EXPORT_FORMATS: { id: ExportFormat; label: string; mime: string }[] = [
  { id: 'png', label: 'PNG', mime: 'image/png' },
  { id: 'jpeg', label: 'JPEG', mime: 'image/jpeg' },
  { id: 'webp', label: 'WebP', mime: 'image/webp' },
]

export const EXPORT_SCALES = [1, 2, 3] as const

// ─── Canvas sizes ───────────────────────────────────────────────────────────

export const SIZE_GROUPS: SizeGroup[] = [
  {
    id: 'ratios',
    label: 'Proporciones',
    sizes: [
      { id: '16:9', label: '16:9', width: 1920, height: 1080 },
      { id: '3:2', label: '3:2', width: 1920, height: 1280 },
      { id: '4:3', label: '4:3', width: 1920, height: 1440 },
      { id: '5:4', label: '5:4', width: 1920, height: 1536 },
      { id: '1:1', label: '1:1', width: 1920, height: 1920 },
      { id: '4:5', label: '4:5', width: 1536, height: 1920 },
      { id: '3:4', label: '3:4', width: 1440, height: 1920 },
      { id: '2:3', label: '2:3', width: 1280, height: 1920 },
      { id: '9:16', label: '9:16', width: 1080, height: 1920 },
    ],
  },
  {
    id: 'instagram',
    label: 'Instagram',
    sizes: [
      { id: 'instagram-post', label: 'Post', hint: '1:1', width: 1080, height: 1080 },
      { id: 'instagram-portrait', label: 'Portrait', hint: '4:5', width: 1080, height: 1350 },
      { id: 'instagram-story', label: 'Story', hint: '9:16', width: 1080, height: 1920 },
    ],
  },
  {
    id: 'twitter',
    label: 'Twitter',
    sizes: [
      { id: 'twitter-post', label: 'Tweet', hint: '16:9', width: 1600, height: 900 },
      { id: 'twitter-cover', label: 'Cover', hint: '3:1', width: 1500, height: 500 },
    ],
  },
  {
    id: 'youtube',
    label: 'YouTube',
    sizes: [
      { id: 'youtube-banner', label: 'Banner', hint: '16:9', width: 2560, height: 1440 },
      { id: 'youtube-thumbnail', label: 'Thumbnail', hint: '16:9', width: 1280, height: 720 },
      { id: 'youtube-video', label: 'Video', hint: '16:9', width: 1920, height: 1080 },
    ],
  },
  {
    id: 'pinterest',
    label: 'Pinterest',
    sizes: [
      { id: 'pinterest-long', label: 'Long', hint: '10:21', width: 1000, height: 2100 },
      { id: 'pinterest-optimal', label: 'Optimal', hint: '2:3', width: 1000, height: 1500 },
      { id: 'pinterest-square', label: 'Square', hint: '1:1', width: 1000, height: 1000 },
    ],
  },
  {
    id: 'dribbble',
    label: 'Dribbble',
    sizes: [{ id: 'dribbble-shot', label: 'Shot', hint: '4:3', width: 1600, height: 1200 }],
  },
  {
    id: 'appstore',
    label: 'App Store',
    sizes: [
      { id: 'appstore-iphone-65', label: 'iPhone 6.5"', hint: '1284:2778', width: 1284, height: 2778 },
      { id: 'appstore-iphone-55', label: 'iPhone 5.5"', hint: '1242:2208', width: 1242, height: 2208 },
      { id: 'appstore-ipad-129', label: 'iPad Pro 12.9"', hint: '2048:2732', width: 2048, height: 2732 },
      { id: 'appstore-iphone-65-landscape', label: 'iPhone 6.5"', hint: '2778:1284', width: 2778, height: 1284 },
      { id: 'appstore-iphone-55-landscape', label: 'iPhone 5.5"', hint: '2208:1242', width: 2208, height: 1242 },
      { id: 'appstore-ipad-129-landscape', label: 'iPad Pro 12.9"', hint: '2732:2048', width: 2732, height: 2048 },
      { id: 'appstore-mac', label: 'Mac', hint: '16:10', width: 2880, height: 1800 },
    ],
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    sizes: [
      { id: 'linkedin-post', label: 'Post', hint: '1.91:1', width: 1200, height: 627 },
      { id: 'linkedin-cover', label: 'Cover', hint: '4:1', width: 1584, height: 396 },
    ],
  },
]

// ─── Backgrounds ────────────────────────────────────────────────────────────
// Photographic categories in shots.so (Desktop, Earth, Texture…) are
// approximated with layered CSS gradients and inline SVG noise: no image
// assets to license, host or load, and nothing html-to-image has to fetch.

const T = 'rgba(0, 0, 0, 0)'
let seq = 0
/** Builds a preset with a sequential id inside its family. */
const bg = (family: string, label: string, css: string): BackgroundPreset => ({ id: `${family}-${++seq}`, label, css })

/** Encodes an SVG for use inside a CSS url(); '#' must be escaped as %23. */
const svg = (markup: string) => `url("data:image/svg+xml;utf8,${markup.replace(/#/g, '%23')}")`

/** Fractal noise tile, optionally tinted, for grain-based textures. */
function noise(frequency: number, octaves: number, opacity: number, stretch = '1 1'): string {
  return svg(
    `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${frequency}' numOctaves='${octaves}' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><g transform='scale(${stretch})'><rect width='100%' height='100%' filter='url(#n)' opacity='${opacity}'/></g></svg>`,
  )
}

const SOLIDS: [string, string][] = [
  ['White', '#ffffff'], ['Paper', '#f5f5f4'], ['Mist', '#e5e7eb'], ['Stone', '#e7e5e4'],
  ['Slate', '#94a3b8'], ['Steel', '#475569'], ['Charcoal', '#1f2937'], ['Ink', '#0a0a0a'],
  ['Coral', '#fca5a5'], ['Blush', '#fecdd3'], ['Apricot', '#fed7aa'], ['Sand', '#fde68a'],
  ['Lemon', '#fef08a'], ['Sun', '#fde047'], ['Lime', '#d9f99d'], ['Mint', '#86efac'],
  ['Pistachio', '#bbf7d0'], ['Aqua', '#99f6e4'], ['Ice', '#a5f3fc'], ['Sky', '#67e8f9'],
  ['sebascm', '#22d3ee'], ['Azure', '#7dd3fc'], ['Cornflower', '#93c5fd'], ['Periwinkle', '#a5b4fc'],
  ['Lavender', '#c4b5fd'], ['Lilac', '#d8b4fe'], ['Orchid', '#f0abfc'], ['Pink', '#f9a8d4'],
]

const GRADIENTS: [string, string[], number?][] = [
  ['Sunset', ['#ffb347', '#ff2d95', '#c026ff']],
  ['Orchid', ['#ff4fd8', '#a020f0', '#6a00ff']],
  ['Blush', ['#ffffff', '#ffd6f5', '#e9b8ff']],
  ['Pastel Sky', ['#a5f3fc', '#fbcfe8', '#fef9c3']],
  ['Cotton', ['#67e8f9', '#c4b5fd', '#fbcfe8']],
  ['Peach Mint', ['#99f6e4', '#fda4af']],
  ['Lavender Mist', ['#fdf4ff', '#f5d0fe', '#e9d5ff']],
  ['Ice', ['#ffffff', '#e0f2fe']],
  ['Graphite', ['#27272a', '#52525b']],
  ['Aqua', ['#22d3ee', '#06b6d4']],
  ['Lagoon', ['#67e8f9', '#a5f3fc']],
  ['Periwinkle', ['#818cf8', '#c7d2fe']],
  ['Cream', ['#fef3c7', '#fef9c3']],
  ['Butter', ['#fef08a', '#fde68a', '#fcd34d']],
  ['Fire', ['#facc15', '#f97316', '#dc2626']],
  ['Vanilla', ['#fefce8', '#fde68a']],
  ['Teal', ['#5eead4', '#22d3ee']],
  ['Citrus', ['#bef264', '#fde047', '#fb7185']],
  ['Dream', ['#e0e7ff', '#fce7f3']],
  ['Indigo', ['#c7d2fe', '#a5b4fc', '#818cf8']],
  ['Dawn', ['#3b82f6', '#f472b6', '#fb923c']],
  ['Mint', ['#34d399', '#22d3ee', '#3b82f6']],
]

const GLASS: [string, string][] = [
  ['Waves', 'repeating-radial-gradient(circle at 30% 120%, #1e3a8a 0 6px, #60a5fa 9px 14px, #e0f2fe 17px 20px)'],
  ['Amber', 'repeating-linear-gradient(100deg, #fde047 0 10px, #f59e0b 14px 22px, #fff7ae 26px 30px)'],
  ['Flare', 'repeating-conic-gradient(from 20deg at 50% 50%, #ef4444 0deg 8deg, #fbbf24 12deg 18deg, #7c2d12 22deg 28deg)'],
  ['Ocean', 'repeating-linear-gradient(60deg, #0f172a 0 8px, #2563eb 12px 18px, #a5f3fc 22px 26px)'],
  ['Neon', 'repeating-linear-gradient(120deg, #1e1b4b 0 10px, #6366f1 14px 20px, #c7d2fe 24px 28px)'],
  ['Chrome', 'repeating-linear-gradient(90deg, #0a0a0a 0 6px, #525252 9px 13px, #f5f5f5 16px 18px)'],
  ['Copper', 'repeating-radial-gradient(circle at 80% 100%, #431407 0 7px, #ea580c 10px 15px, #fed7aa 18px 21px)'],
  ['Lava', 'repeating-linear-gradient(135deg, #450a0a 0 9px, #dc2626 13px 19px, #fb923c 23px 27px)'],
  ['Prism', 'repeating-conic-gradient(from 0deg at 20% 80%, #1d4ed8 0deg 6deg, #f0abfc 10deg 14deg, #ffffff 17deg 20deg)'],
  ['Cobalt', 'repeating-radial-gradient(circle at 0% 0%, #172554 0 6px, #3b82f6 9px 14px, #dbeafe 17px 19px)'],
  ['Ember', 'repeating-linear-gradient(75deg, #1c1917 0 8px, #f97316 12px 17px, #fde68a 21px 24px)'],
  ['Aurora', 'repeating-linear-gradient(160deg, #022c22 0 9px, #10b981 13px 19px, #a7f3d0 23px 26px)'],
]

const cosmicBottom = (g1: string, g2: string, base: string) =>
  `radial-gradient(130% 70% at 50% 115%, ${g1} 0%, ${g2} 35%, ${T} 70%), ${base}`
const cosmicCorner = (g1: string, g2: string, base: string) =>
  `radial-gradient(100% 80% at 100% 0%, ${g1} 0%, ${g2} 30%, ${T} 65%), ${base}`
const cosmicBand = (g1: string, g2: string, base: string) =>
  `linear-gradient(160deg, ${T} 38%, ${g2} 54%, ${g1} 60%, ${T} 76%), ${base}`

const COSMIC: [string, string][] = [
  ['Rose', cosmicBottom('#ff7ad9', '#8b5cf6', '#0b0b1a')],
  ['Dusk', cosmicBottom('#f0abfc', '#6366f1', '#09090b')],
  ['Haze', cosmicBottom('#fb7185', '#a855f7', '#0f0f14')],
  ['Violet', cosmicCorner('#c084fc', '#4c1d95', '#0a0a14')],
  ['Nova', cosmicCorner('#60a5fa', '#1e3a8a', '#050510')],
  ['Eclipse', cosmicBottom('#e879f9', '#3b0764', '#030307')],
  ['Comet', cosmicBand('#f472b6', '#7c3aed', '#07070d')],
  ['Nebula', cosmicCorner('#f0abfc', '#6d28d9', '#08060f')],
  ['Pulsar', cosmicBand('#22d3ee', '#1e40af', '#030712')],
  ['Aurora', cosmicBottom('#5eead4', '#0e7490', '#020617')],
  ['Quasar', cosmicBand('#a5b4fc', '#4338ca', '#05050c')],
]

const arc = (c1: string, c2: string, at = '50% 130%') =>
  `radial-gradient(160% 100% at ${at}, ${c1} 0 38%, ${c2} 46%, #ffffff 60%)`
const ring = (c1: string, c2: string) =>
  `radial-gradient(140% 90% at 50% 120%, #ffffff 0 30%, ${c1} 40%, ${c2} 52%, #ffffff 66%)`
const halo = (c1: string, c2: string, at = '50% 50%') =>
  `radial-gradient(40% 35% at ${at}, ${c1} 0%, ${c2} 45%, #ffffff 75%)`

const MYSTIC: [string, string][] = [
  ['Arc', arc('#4f46e5', '#a5b4fc')],
  ['Glow', ring('#f0abfc', '#7c3aed')],
  ['Lilac', arc('#8b5cf6', '#c4b5fd')],
  ['Tide', arc('#6366f1', '#e0e7ff', '0% 120%')],
  ['Bloom', halo('#f0abfc', '#e9d5ff')],
  ['Mint', ring('#6ee7b7', '#10b981')],
  ['Wave', arc('#a855f7', '#f5d0fe', '100% 120%')],
  ['Orb', halo('#c084fc', '#f5d0fe', '50% 35%')],
  ['Dawn', arc('#fb7185', '#fecdd3')],
  ['Halo', ring('#a5b4fc', '#6366f1')],
  ['Pearl', halo('#e0e7ff', '#f5f3ff', '50% 60%')],
  ['Sunrise', arc('#f59e0b', '#fde68a')],
  ['Rose', ring('#fbcfe8', '#ec4899')],
  ['Lagoon', arc('#06b6d4', '#a5f3fc')],
  ['Candy', halo('#f472b6', '#fbcfe8', '40% 40%')],
  ['Gold', ring('#fde68a', '#f59e0b')],
]

const hills = (s1: string, s2: string, h1: string, h2: string) =>
  `radial-gradient(120% 60% at 20% 100%, ${h1} 0 40%, ${T} 41%), radial-gradient(120% 70% at 80% 110%, ${h2} 0 45%, ${T} 46%), linear-gradient(180deg, ${s1} 0%, ${s2} 100%)`
const flow = (c1: string, c2: string, c3: string, base: string) =>
  `radial-gradient(90% 60% at 10% 90%, ${c1} 0%, ${T} 60%), radial-gradient(80% 70% at 90% 20%, ${c2} 0%, ${T} 60%), radial-gradient(60% 50% at 50% 60%, ${c3} 0%, ${T} 70%), ${base}`

const DESKTOP: [string, string][] = [
  ['Sonoma', hills('#bae6fd', '#e0f2fe', '#1d4ed8', '#38bdf8')],
  ['Ventura', hills('#fde68a', '#fbcfe8', '#7c3aed', '#f97316')],
  ['Glacier', 'linear-gradient(180deg, #7dd3fc 0%, #e0f2fe 45%, #f8fafc 46%, #cbd5e1 100%)'],
  ['Dune', hills('#fde68a', '#fef3c7', '#f59e0b', '#b45309')],
  ['Big Sur', hills('#fecaca', '#fef3c7', '#be123c', '#7c2d12')],
  ['Monterey', flow('#ec4899', '#6366f1', '#f97316', '#1e1b4b')],
  ['Catalina', hills('#c7d2fe', '#fae8ff', '#312e81', '#6d28d9')],
  ['Sequoia', flow('#22d3ee', '#a855f7', '#3b82f6', '#0f172a')],
  ['Meadow', hills('#bbf7d0', '#f0fdf4', '#16a34a', '#65a30d')],
  ['Flux', flow('#f472b6', '#facc15', '#fb923c', '#7c2d12')],
  ['Aqua', flow('#67e8f9', '#3b82f6', '#a5f3fc', '#0c4a6e')],
  ['Orchard', hills('#fed7aa', '#fff7ed', '#ea580c', '#9a3412')],
  ['Midnight', flow('#312e81', '#1e40af', '#6d28d9', '#020617')],
  ['Lilac', flow('#e9d5ff', '#c4b5fd', '#f5d0fe', '#faf5ff')],
  ['Coast', hills('#bfdbfe', '#eff6ff', '#0369a1', '#0284c7')],
  ['Ember', flow('#f97316', '#dc2626', '#fbbf24', '#1c1917')],
]

const blobs = (c1: string, c2: string, base: string, a = '25% 30%', b = '80% 70%') =>
  `radial-gradient(60% 60% at ${a}, ${c1} 0%, ${T} 70%), radial-gradient(60% 60% at ${b}, ${c2} 0%, ${T} 70%), ${base}`

const ABSTRACT: [string, string][] = [
  ['Plum', blobs('#7c3aed', '#f97316', '#1e1b4b')],
  ['Tide', blobs('#2563eb', '#fb923c', '#0c1a3a', '20% 80%', '80% 20%')],
  ['Lava', blobs('#ef4444', '#f59e0b', '#111111', '70% 35%', '25% 75%')],
  ['Amber', blobs('#fbbf24', '#db2777', '#3b0a2a', '30% 30%', '75% 75%')],
  ['Frost', blobs('#bae6fd', '#e9d5ff', '#ffffff')],
  ['Jade', blobs('#10b981', '#0e7490', '#022c22', '75% 25%', '20% 70%')],
  ['Candy', blobs('#f9a8d4', '#a5b4fc', '#fdf4ff', '70% 30%', '30% 80%')],
  ['Berry', blobs('#be185d', '#6d28d9', '#1a0b1f')],
  ['Citrus', blobs('#facc15', '#22c55e', '#fefce8', '20% 20%', '85% 80%')],
  ['Ocean', blobs('#0ea5e9', '#1d4ed8', '#0b1120', '80% 30%', '25% 80%')],
  ['Peach', blobs('#fdba74', '#fda4af', '#fff7ed')],
  ['Smoke', blobs('#71717a', '#27272a', '#0a0a0a', '70% 20%', '20% 80%')],
  ['Neon', blobs('#22d3ee', '#e879f9', '#09090b', '15% 30%', '85% 70%')],
  ['Sorbet', blobs('#fde68a', '#f0abfc', '#ffffff', '75% 25%', '25% 75%')],
  ['Forest', blobs('#4d7c0f', '#166534', '#052e16')],
  ['Rust', blobs('#c2410c', '#78350f', '#1c1917', '30% 70%', '80% 25%')],
]

/** Sky, two mountain ridges and an optional sun, all with hard gradient stops. */
const landscape = (sky1: string, sky2: string, far: string, near: string, sun?: string) =>
  [
    `linear-gradient(165deg, ${T} 57%, ${near} 57.2%, ${near} 100%)`,
    `linear-gradient(200deg, ${T} 50%, ${far} 50.2%, ${far} 100%)`,
    sun ? `radial-gradient(18% 14% at 70% 42%, ${sun} 0%, ${sun} 55%, ${T} 60%)` : null,
    `linear-gradient(180deg, ${sky1} 0%, ${sky2} 70%)`,
  ]
    .filter(Boolean)
    .join(', ')

const EARTH: [string, string][] = [
  ['Alps', landscape('#7dd3fc', '#e0f2fe', '#64748b', '#334155')],
  ['Forest', landscape('#a7f3d0', '#ecfdf5', '#166534', '#14532d')],
  ['Sunset', landscape('#f97316', '#db2777', '#3b0764', '#1e1b4b', '#fde047')],
  ['Sea', 'linear-gradient(180deg, rgba(255, 255, 255, 0) 55%, #0369a1 55.2%, #082f49 100%), linear-gradient(180deg, #bae6fd 0%, #f0f9ff 55%)'],
  ['Desert', landscape('#fde68a', '#fef3c7', '#d97706', '#b45309', '#fff7ed')],
  ['Dunes', landscape('#fed7aa', '#ffedd5', '#ea580c', '#c2410c')],
  ['Fjord', landscape('#cbd5e1', '#f1f5f9', '#475569', '#1e293b')],
  ['Canyon', landscape('#fdba74', '#fed7aa', '#9a3412', '#7c2d12', '#fffbeb')],
  ['Tundra', landscape('#e2e8f0', '#f8fafc', '#94a3b8', '#e2e8f0')],
  ['Night', landscape('#1e1b4b', '#312e81', '#1e293b', '#0f172a', '#f8fafc')],
  ['Highlands', landscape('#bbf7d0', '#f0fdf4', '#4d7c0f', '#365314')],
  ['Dusk', landscape('#c4b5fd', '#fbcfe8', '#6d28d9', '#4c1d95', '#fef3c7')],
]

const radiant = (c1: string, c2: string, a = '35% 40%', b = '65% 60%') =>
  `radial-gradient(45% 40% at ${a}, ${c1} 0%, ${T} 70%), radial-gradient(40% 40% at ${b}, ${c2} 0%, ${T} 70%), #ffffff`

const RADIANT: [string, string][] = [
  ['Violet', radiant('#c084fc', '#f472b6')],
  ['Iris', radiant('#818cf8', '#c084fc', '40% 35%', '60% 65%')],
  ['Petal', radiant('#fbcfe8', '#fda4af', '50% 30%', '50% 70%')],
  ['Ember', radiant('#fb923c', '#f43f5e')],
  ['Sun', radiant('#fb923c', '#fde047', '50% 50%', '50% 50%')],
  ['Coral', radiant('#fda4af', '#fdba74', '30% 60%', '70% 40%')],
  ['Dusk', radiant('#a855f7', '#fb923c', '70% 30%', '30% 70%')],
  ['Fuchsia', radiant('#e879f9', '#f97316')],
  ['Lilac', radiant('#d8b4fe', '#f0abfc', '60% 40%', '40% 60%')],
  ['Rose', radiant('#f472b6', '#c084fc', '35% 65%', '65% 35%')],
  ['Blush', radiant('#fecdd3', '#fbcfe8')],
  ['Mist', radiant('#e9d5ff', '#c7d2fe', '50% 60%', '50% 40%')],
  ['Night', 'radial-gradient(45% 40% at 40% 60%, #a855f7 0%, rgba(0, 0, 0, 0) 70%), radial-gradient(40% 40% at 60% 40%, #f97316 0%, rgba(0, 0, 0, 0) 70%), #18181b'],
  ['Gold', radiant('#fde047', '#f472b6', '40% 40%', '65% 65%')],
]

const TEXTURE: [string, string][] = [
  ['Paper', `${noise(0.9, 3, 0.18)}, #f7f5f0`],
  ['Linen', `repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.04) 0 1px, rgba(0, 0, 0, 0) 1px 3px), repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.04) 0 1px, rgba(0, 0, 0, 0) 1px 3px), #efe9dd`],
  ['Wood', `${noise(0.02, 3, 0.35, '1 12')}, repeating-linear-gradient(90deg, #a0643c 0 14px, #8a5230 18px 26px, #b07448 30px 40px)`],
  ['Brick', `repeating-linear-gradient(0deg, #8f4230 0 3px, rgba(0, 0, 0, 0) 3px 28px), repeating-linear-gradient(90deg, #8f4230 0 3px, rgba(0, 0, 0, 0) 3px 56px), ${noise(0.8, 2, 0.25)}, #b4583f`],
  ['Concrete', `${noise(0.65, 4, 0.45)}, #9ca3af`],
  ['Marble', `${noise(0.012, 5, 0.55, '1 3')}, #f4f4f5`],
  ['Obsidian', `${noise(0.015, 5, 0.4, '1 3')}, #111113`],
  ['Felt', `${noise(1.2, 2, 0.3)}, #14532d`],
  ['Leather', `${noise(0.35, 4, 0.4)}, #7c2d12`],
  ['Denim', `repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.05) 0 1px, rgba(0, 0, 0, 0) 1px 4px), ${noise(0.9, 2, 0.25)}, #1e3a5f`],
  ['Carbon', 'repeating-linear-gradient(45deg, #1a1a1a 0 4px, #242424 4px 8px), repeating-linear-gradient(-45deg, #1a1a1a 0 4px, #242424 4px 8px)'],
  ['Terrazzo', 'radial-gradient(circle at 20% 30%, #fb923c 0 3%, rgba(0, 0, 0, 0) 3.5%), radial-gradient(circle at 70% 20%, #0f766e 0 2.5%, rgba(0, 0, 0, 0) 3%), radial-gradient(circle at 45% 70%, #1e293b 0 2%, rgba(0, 0, 0, 0) 2.5%), radial-gradient(circle at 85% 75%, #f43f5e 0 2.5%, rgba(0, 0, 0, 0) 3%), #f5f0e8'],
  ['Grid', 'linear-gradient(rgba(34, 211, 238, 0.18) 1px, rgba(0, 0, 0, 0) 1px) 0 0 / 28px 28px, linear-gradient(90deg, rgba(34, 211, 238, 0.18) 1px, rgba(0, 0, 0, 0) 1px) 0 0 / 28px 28px, #fdfdfb'],
]

function family(id: string, label: string, entries: [string, string][]): BackgroundCategory {
  seq = 0
  return { id, label, presets: entries.map(([name, css]) => bg(id, name, css)) }
}

export const BACKGROUND_CATEGORIES: BackgroundCategory[] = [
  family('solid', 'Solid', SOLIDS.map(([name, hex]) => [name, hex])),
  {
    id: 'gradient',
    label: 'Gradient',
    presets: [
      // First entry keeps a stable id: it is the default background.
      { id: 'gradient-sunset', label: 'Sunset', css: 'linear-gradient(135deg, #ffb347 0%, #ff2d95 50%, #c026ff 100%)' },
      ...family(
        'gradient',
        'Gradient',
        GRADIENTS.slice(1).map(([name, stops, angle = 135]): [string, string] => [name, `linear-gradient(${angle}deg, ${stops.join(', ')})`]),
      ).presets,
    ],
  },
  family('glass', 'Glass', GLASS),
  family('cosmic', 'Cosmic', COSMIC),
  family('mystic', 'Mystic', MYSTIC),
  family('desktop', 'Desktop', DESKTOP),
  family('abstract', 'Abstract', ABSTRACT),
  family('earth', 'Earth', EARTH),
  family('radiant', 'Radiant', RADIANT),
  family('texture', 'Texture', TEXTURE),
]

export const BACKGROUNDS: BackgroundPreset[] = BACKGROUND_CATEGORIES.flatMap((c) => c.presets)

export function findDevice(id: string): DevicePreset {
  return DEVICES.find((d) => d.id === id) ?? DEVICES[0]
}

export function findSize(id: string): SizePreset | undefined {
  for (const group of SIZE_GROUPS) {
    const size = group.sizes.find((s) => s.id === id)
    if (size) return size
  }
  return undefined
}
