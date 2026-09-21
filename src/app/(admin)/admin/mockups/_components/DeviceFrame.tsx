'use client'

/* eslint-disable @next/next/no-img-element */
// next/image is deliberately avoided: the source is an in-memory data URL and
// html-to-image needs the plain <img> it serialises, not Next's optimiser.

import type { CSSProperties, ReactNode } from 'react'
import { GEOMETRY, type DevicePreset, type DeviceVariant } from '@/lib/mockup'
import { mixHex } from '@/lib/mockup/palette'

type Props = {
  device: DevicePreset
  variant: DeviceVariant
  /** Data URL of the screenshot, or null to draw a placeholder screen. */
  image: string | null
  /** Corner radius in on-screen px, for the screenshot and browser devices. */
  radius: number
  /** box-shadow applied to the device body. */
  shadow: string
  /** background-image of the light reflection laid over the screen. */
  light: string
  /** Placeholder wording; thumbnails pass an empty string to stay quiet. */
  placeholder?: string
}

// Every measurement below is a fraction of the device width expressed in cqw,
// so the frame scales with the mockup and matches mockupAspect() exactly.
const cq = (fraction: number) => `${fraction * 100}cqw`

/** Brushed-metal shading derived from a single body colour. */
function metal(color: string): string {
  return `linear-gradient(145deg, ${mixHex(color, '#ffffff', 0.35)} 0%, ${color} 45%, ${mixHex(color, '#000000', 0.3)} 100%)`
}

function Screen({
  image,
  fixed,
  light,
  placeholder,
  wallpaper,
}: {
  image: string | null
  /** True for devices with a fixed screen ratio: the image then fills it. */
  fixed: boolean
  light: string
  placeholder: string
  wallpaper: string
}) {
  const overlay =
    light !== 'none' ? <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: light }} /> : null

  if (image) {
    return fixed ? (
      <>
        <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
        {overlay}
      </>
    ) : (
      <div className="relative">
        <img src={image} alt="" className="block w-full h-auto" />
        {overlay}
      </div>
    )
  }

  const content = placeholder ? (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-[1.2cqw] text-center">
      <span className="font-semibold text-white/60" style={{ fontSize: '4.5cqw', lineHeight: 1.1 }}>
        {placeholder}
      </span>
      <span className="text-white/35" style={{ fontSize: '1.8cqw' }}>
        o pegala con Ctrl+V
      </span>
    </div>
  ) : null

  return fixed ? (
    <div className="absolute inset-0" style={{ background: wallpaper }}>
      {content}
      {overlay}
    </div>
  ) : (
    <div className="relative w-full aspect-[16/10] bg-[#1c1c1c]">
      {content}
      {overlay}
    </div>
  )
}

function Root({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="relative w-full" style={{ containerType: 'inline-size', ...style }}>
      {children}
    </div>
  )
}

export function DeviceFrame({ device, variant, image, radius, shadow, light, placeholder = 'Drop or Paste' }: Props) {
  const g = GEOMETRY
  const ratio = device.screen ? `${device.screen.width} / ${device.screen.height}` : undefined
  const wallpaper = `radial-gradient(120% 80% at 30% 20%, ${mixHex(variant.color, '#ffffff', 0.25)} 0%, ${mixHex(variant.color, '#000000', 0.55)} 70%)`
  const screen = (
    <Screen image={image} fixed={Boolean(device.screen)} light={light} placeholder={placeholder} wallpaper={wallpaper} />
  )

  switch (device.kind) {
    case 'screenshot':
      // Wrapped in Root like every other device: without a container ancestor,
      // the placeholder's cqw units silently fall back to the viewport width
      // and the text stops shrinking with the device.
      return (
        <Root>
          <div style={{ borderRadius: radius, boxShadow: shadow, overflow: 'hidden' }} className="relative leading-[0]">
            {screen}
          </div>
        </Root>
      )

    case 'browser': {
      const isLight = variant.id === 'light'
      const bar = isLight ? '#f1f5f9' : '#1e1e1e'
      const line = isLight ? '#e2e8f0' : '#2c2c2c'
      return (
        <Root>
          <div style={{ borderRadius: radius, boxShadow: shadow, overflow: 'hidden' }} className="leading-[0]">
            <div
              className="flex items-center"
              style={{ height: cq(g.browserBar), background: bar, borderBottom: `1px solid ${line}`, gap: cq(0.012), padding: `0 ${cq(0.014)}` }}
            >
              {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
                <span key={c} className="rounded-full shrink-0" style={{ width: cq(0.011), height: cq(0.011), background: c }} />
              ))}
              <span
                className="flex-1"
                style={{ height: cq(0.022), marginLeft: cq(0.02), marginRight: cq(0.08), borderRadius: cq(0.006), background: isLight ? '#ffffff' : '#2a2a2a', border: `1px solid ${line}` }}
              />
            </div>
            {screen}
          </div>
        </Root>
      )
    }

    case 'phone':
    case 'tablet': {
      const phone = device.kind === 'phone'
      const bezel = phone ? g.phoneBezel : g.tabletBezel
      const edge = phone ? 0.01 : 0.008
      const outerRadius = phone ? 0.15 : 0.05
      return (
        <Root>
          <div style={{ padding: cq(edge), borderRadius: cq(outerRadius), background: metal(variant.color), boxShadow: shadow }}>
            <div style={{ padding: cq(bezel - edge), borderRadius: cq(outerRadius - edge), background: '#050505' }}>
              <div className="relative overflow-hidden" style={{ aspectRatio: ratio, borderRadius: cq(phone ? 0.115 : 0.025) }}>
                {screen}
                {phone && device.cutout === 'island' && (
                  <div className="absolute left-1/2 -translate-x-1/2 bg-black rounded-full" style={{ top: cq(0.022), width: cq(0.27), height: cq(0.075) }} />
                )}
                {phone && device.cutout === 'notch' && (
                  <div
                    className="absolute left-1/2 -translate-x-1/2 top-0 bg-black"
                    style={{ width: cq(0.36), height: cq(0.07), borderRadius: `0 0 ${cq(0.05)} ${cq(0.05)}` }}
                  />
                )}
                {phone && device.cutout === 'punch' && (
                  <div className="absolute left-1/2 -translate-x-1/2 bg-black rounded-full" style={{ top: cq(0.03), width: cq(0.034), height: cq(0.034) }} />
                )}
              </div>
            </div>
          </div>
          {phone ? (
            <>
              <span className="absolute rounded-l-sm" style={{ left: cq(-0.008), top: '21%', width: cq(0.009), height: cq(0.07), background: metal(variant.color) }} />
              <span className="absolute rounded-l-sm" style={{ left: cq(-0.008), top: '30%', width: cq(0.009), height: cq(0.11), background: metal(variant.color) }} />
              <span className="absolute rounded-r-sm" style={{ right: cq(-0.008), top: '27%', width: cq(0.009), height: cq(0.15), background: metal(variant.color) }} />
            </>
          ) : (
            <span className="absolute left-1/2 -translate-x-1/2 rounded-full bg-[#1a1a1a]" style={{ top: cq(0.011), width: cq(0.009), height: cq(0.009) }} />
          )}
        </Root>
      )
    }

    case 'watch': {
      const band = mixHex(variant.color, '#000000', 0.45)
      const bandStyle: CSSProperties = {
        height: cq(g.watchBand),
        width: '72%',
        margin: '0 auto',
        background: `linear-gradient(90deg, ${mixHex(band, '#000000', 0.25)}, ${band} 50%, ${mixHex(band, '#000000', 0.25)})`,
      }
      return (
        <Root>
          <div style={{ ...bandStyle, borderRadius: `${cq(0.08)} ${cq(0.08)} 0 0` }} />
          <div style={{ padding: cq(0.015), borderRadius: cq(0.22), background: metal(variant.color), boxShadow: shadow }}>
            <div style={{ padding: cq(g.watchBezel - 0.015), borderRadius: cq(0.2), background: '#050505' }}>
              <div className="relative overflow-hidden" style={{ aspectRatio: ratio, borderRadius: cq(0.14) }}>
                {screen}
              </div>
            </div>
          </div>
          <div style={{ ...bandStyle, borderRadius: `0 0 ${cq(0.08)} ${cq(0.08)}` }} />
          <span className="absolute rounded-r-md" style={{ right: cq(-0.03), top: '42%', width: cq(0.035), height: cq(0.1), background: metal(variant.color) }} />
        </Root>
      )
    }

    case 'laptop': {
      const lidBezel = g.laptopLid * g.laptopBezel
      return (
        <Root>
          <div
            className="mx-auto"
            style={{
              width: cq(g.laptopLid),
              padding: cq(lidBezel),
              background: '#070707',
              borderRadius: `${cq(0.024)} ${cq(0.024)} 0 0`,
              boxShadow: `0 0 0 ${cq(0.0035)} ${mixHex(variant.color, '#000000', 0.15)}${shadow !== 'none' ? `, ${shadow}` : ''}`,
            }}
          >
            <div className="relative overflow-hidden" style={{ aspectRatio: ratio, borderRadius: cq(0.004) }}>
              {screen}
              <div className="absolute left-1/2 -translate-x-1/2 top-0 bg-[#070707]" style={{ width: cq(0.07), height: cq(0.014), borderRadius: `0 0 ${cq(0.006)} ${cq(0.006)}` }} />
            </div>
          </div>
          <div
            className="relative"
            style={{
              height: cq(g.laptopBase),
              background: `linear-gradient(180deg, ${mixHex(variant.color, '#ffffff', 0.4)} 0%, ${variant.color} 35%, ${mixHex(variant.color, '#000000', 0.35)} 100%)`,
              borderRadius: `${cq(0.004)} ${cq(0.004)} ${cq(0.05)} ${cq(0.05)} / ${cq(0.004)} ${cq(0.004)} ${cq(0.025)} ${cq(0.025)}`,
              boxShadow: shadow,
            }}
          >
            <div className="absolute left-1/2 -translate-x-1/2 top-0" style={{ width: cq(0.16), height: cq(0.012), background: mixHex(variant.color, '#000000', 0.25), borderRadius: `0 0 ${cq(0.01)} ${cq(0.01)}` }} />
          </div>
        </Root>
      )
    }

    case 'monitor': {
      // A generic display that adapts to the screenshot: thin bezel, slim stand.
      const body = variant.color
      return (
        <Root>
          <div style={{ padding: cq(g.monitorBezel), borderRadius: cq(0.012), background: body, boxShadow: shadow }}>
            <div className="relative overflow-hidden" style={{ borderRadius: cq(0.004) }}>
              {screen}
            </div>
          </div>
          <div className="mx-auto" style={{ width: cq(0.05), height: cq(g.monitorNeck), background: `linear-gradient(90deg, ${mixHex(body, '#000000', 0.2)}, ${mixHex(body, '#ffffff', 0.15)}, ${mixHex(body, '#000000', 0.2)})` }} />
          <div className="mx-auto" style={{ width: cq(0.22), height: cq(g.monitorFoot), background: body, borderRadius: `${cq(0.006)} ${cq(0.006)} ${cq(0.003)} ${cq(0.003)}` }} />
        </Root>
      )
    }

    case 'desktop': {
      const chin = device.chin ?? g.desktopChin
      // The iMac pairs a light front bezel with a coloured chin; pro displays
      // use a dark bezel, and a flat-chin display is one uniform dark slab.
      const flat = device.chin !== undefined
      const bezelColor = device.bezel === 'dark' ? '#0b0b0b' : '#f2f2f4'
      return (
        <Root>
          <div
            className="overflow-hidden"
            style={{
              borderRadius: cq(0.02),
              boxShadow: `0 0 0 ${cq(0.003)} ${mixHex(variant.color, '#000000', 0.1)}${shadow !== 'none' ? `, ${shadow}` : ''}`,
            }}
          >
            <div style={{ padding: `${cq(g.desktopBezel)} ${cq(g.desktopBezel)} 0`, background: bezelColor }}>
              <div className="relative overflow-hidden bg-black" style={{ aspectRatio: ratio, borderRadius: cq(0.004) }}>
                {screen}
              </div>
            </div>
            <div style={{ height: cq(chin), background: flat ? bezelColor : metal(variant.color) }} />
          </div>
          <div
            className="mx-auto"
            style={{
              width: cq(0.22),
              height: cq(g.desktopStand - 0.03),
              background: metal(variant.color),
              clipPath: 'polygon(12% 0, 88% 0, 100% 100%, 0 100%)',
            }}
          />
          <div className="mx-auto" style={{ width: cq(0.3), height: cq(0.03), background: metal(variant.color), borderRadius: cq(0.006) }} />
        </Root>
      )
    }
  }
}
