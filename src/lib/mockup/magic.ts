// Magic Presets: complete looks derived from the screenshot itself. Each one
// pairs a palette-generated background with a style, shadow and angle chosen
// to make that particular screenshot stand out.

import type { BackgroundPreset, BackgroundTone, ShadowMode } from './catalog'
import { analysePalette, buildMagicBackgrounds, type PaletteAnalysis } from './palette'
import type { Look } from './state'

/**
 * Background tones in order of preference for a screenshot of a given tone.
 * Contrast first: a dark interface pops on a vivid or light backdrop and sinks
 * into a dark one; a light interface is the mirror image.
 */
const CONTRAST_ORDER: Record<PaletteAnalysis['tone'], BackgroundTone[]> = {
  dark: ['vivid', 'light', 'dark'],
  light: ['dark', 'vivid', 'light'],
  mid: ['vivid', 'dark', 'light'],
}

/**
 * A coloured glow reads beautifully on a dark backdrop and turns muddy on a
 * light one, and it needs a colourful screenshot to have a colour to glow with.
 */
function shadowFor(tone: BackgroundTone | undefined, analysis: PaletteAnalysis, preferGlow: boolean): ShadowMode {
  return preferGlow && tone === 'dark' && analysis.vivid ? 'adaptive' : 'spread'
}

export function buildMagicLooks(palette: string[]): Look[] {
  const backgrounds = buildMagicBackgrounds(palette)
  if (backgrounds.length === 0) return []

  const analysis = analysePalette(palette)
  const order = CONTRAST_ORDER[analysis.tone]

  /** Backgrounds ranked by contrast with this screenshot. */
  const ranked = [...backgrounds].sort((a, b) => order.indexOf(a.tone!) - order.indexOf(b.tone!))
  const firstOfTone = (tone: BackgroundTone): BackgroundPreset => backgrounds.find((b) => b.tone === tone) ?? ranked[0]

  const contrast = ranked[0]
  const runnerUp = ranked.find((b) => b.tone !== contrast.tone) ?? ranked[1] ?? contrast
  const dark = firstOfTone('dark')
  const vivid = firstOfTone('vivid')
  const light = firstOfTone('light')

  return [
    {
      id: 'magic-contrast',
      label: 'Contraste',
      patch: {
        backgroundId: contrast.id,
        styleId: 'default',
        shadowMode: shadowFor(contrast.tone, analysis, false),
        shadowOpacity: contrast.tone === 'dark' ? 55 : 40,
        sceneId: 'none',
        rotateX: 0,
        rotateY: 0,
        rotateZ: 0,
        zoom: 80,
        lightIntensity: 0,
        noise: 0,
        vignette: 0,
      },
    },
    {
      id: 'magic-glow',
      label: 'Glow',
      patch: {
        backgroundId: dark.id,
        // Glass takes the colour opposite to the interface so its rim shows.
        styleId: analysis.tone === 'dark' ? 'glass-light' : 'glass-dark',
        shadowMode: shadowFor(dark.tone, analysis, true),
        shadowOpacity: 60,
        sceneId: analysis.vivid ? 'shapes' : 'none',
        rotateX: 8,
        rotateY: -14,
        rotateZ: 2,
        zoom: 72,
        lightIntensity: 25,
        noise: 10,
        vignette: 0,
      },
    },
    {
      id: 'magic-vivid',
      label: 'Vivid',
      patch: {
        backgroundId: vivid.id,
        styleId: analysis.tone === 'dark' ? 'border' : 'outline',
        shadowMode: 'hug',
        shadowOpacity: 35,
        sceneId: 'none',
        rotateX: 0,
        rotateY: 0,
        rotateZ: 0,
        zoom: 78,
        lightIntensity: 0,
        noise: 0,
        vignette: 0,
      },
    },
    {
      id: 'magic-soft',
      label: 'Soft',
      patch: {
        backgroundId: light.id,
        styleId: 'inset-light',
        shadowMode: shadowFor(light.tone, analysis, false),
        shadowOpacity: 30,
        sceneId: 'none',
        rotateX: 0,
        rotateY: 0,
        rotateZ: 0,
        zoom: 76,
        lightIntensity: 20,
        noise: 0,
        vignette: 0,
      },
    },
    {
      id: 'magic-hero',
      label: 'Hero',
      patch: {
        backgroundId: runnerUp.id,
        styleId: 'default',
        shadowMode: shadowFor(runnerUp.tone, analysis, true),
        shadowOpacity: 55,
        sceneId: 'none',
        rotateX: 18,
        rotateY: 0,
        rotateZ: -4,
        zoom: 84,
        lightIntensity: 15,
        noise: 8,
        // A vignette frames a dark scene and just greys out a light one.
        vignette: runnerUp.tone === 'dark' ? 30 : 0,
      },
    },
    {
      id: 'magic-editorial',
      label: 'Editorial',
      patch: {
        backgroundId: light.tone === 'light' ? light.id : contrast.id,
        styleId: 'default',
        shadowMode: 'spread',
        shadowOpacity: 38,
        // Window-blind light only makes sense falling on a light surface.
        sceneId: light.tone === 'light' ? 'shadow' : 'none',
        rotateX: 0,
        rotateY: 0,
        rotateZ: 0,
        zoom: 74,
        lightIntensity: 0,
        noise: 0,
        vignette: 0,
      },
    },
  ]
}
