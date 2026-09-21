'use client'

// Glossy pseudo-3D shapes for the Shapes scene, drawn with gradients and
// inline SVG. Inline markup (not image files) keeps them exportable as-is.

import { useId, type CSSProperties } from 'react'
import type { ShapeItem, ShapeKind } from '@/lib/mockup'
import { mixHex } from '@/lib/mockup/palette'

/** Default iridescent pair, used when the screenshot has no brand colours. */
export const SHAPE_COLORS: [string, string] = ['#60a5fa', '#c084fc']

function ShapeSvg({ kind, colors }: { kind: ShapeKind; colors: [string, string] }) {
  // useId output contains characters like ':' that break inside url(#…).
  const id = `shape${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const [a, b] = colors
  const light = mixHex(a, '#ffffff', 0.55)
  const dark = mixHex(b, '#000000', 0.35)
  const gradient = (
    <defs>
      <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={light} />
        <stop offset="0.5" stopColor={a} />
        <stop offset="1" stopColor={dark} />
      </linearGradient>
    </defs>
  )
  const fill = `url(#${id}-g)`

  switch (kind) {
    case 'cube':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon points="50,6 92,28 50,50 8,28" fill={light} />
          <polygon points="8,28 50,50 50,96 8,74" fill={a} />
          <polygon points="92,28 92,74 50,96 50,50" fill={dark} />
        </svg>
      )
    case 'cone':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {gradient}
          <polygon points="50,4 92,86 8,86" fill={fill} />
          <ellipse cx="50" cy="86" rx="42" ry="10" fill={dark} />
        </svg>
      )
    case 'star':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {gradient}
          <polygon points="50,4 61,38 96,38 68,59 79,94 50,73 21,94 32,59 4,38 39,38" fill={fill} />
        </svg>
      )
    case 'diamond':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {gradient}
          {/* evenodd cuts the inner diamond out, leaving a ring */}
          <path d="M50 2 L98 50 L50 98 L2 50 Z M50 26 L74 50 L50 74 L26 50 Z" fill={fill} fillRule="evenodd" />
        </svg>
      )
    default:
      return null
  }
}

export function ShapeView({ item, colors }: { item: ShapeItem; colors: [string, string] }) {
  const [a, b] = colors
  const style: CSSProperties = {
    left: `${item.x}%`,
    top: `${item.y}%`,
    width: `${item.size}%`,
    transform: `translate(-50%, -50%) rotate(${item.rotate}deg)`,
    filter: 'drop-shadow(0 10px 18px rgba(0, 0, 0, 0.35))',
  }

  if (item.kind === 'sphere') {
    return (
      <span
        className="absolute rounded-full aspect-square"
        style={{ ...style, background: `radial-gradient(circle at 32% 28%, #ffffff 0%, ${mixHex(a, '#ffffff', 0.4)} 12%, ${a} 45%, ${mixHex(b, '#000000', 0.45)} 100%)` }}
      />
    )
  }
  if (item.kind === 'torus') {
    // A ring drawn entirely with one radial gradient, plus a soft highlight arc.
    return (
      <span
        className="absolute rounded-full aspect-square"
        style={{
          ...style,
          background: `radial-gradient(circle, rgba(0, 0, 0, 0) 0 34%, ${mixHex(b, '#000000', 0.3)} 35%, ${a} 46%, ${mixHex(a, '#ffffff', 0.5)} 52%, ${b} 62%, ${mixHex(b, '#000000', 0.35)} 69%, rgba(0, 0, 0, 0) 70%)`,
        }}
      />
    )
  }
  if (item.kind === 'pill') {
    return (
      <span
        className="absolute rounded-full"
        style={{
          ...style,
          aspectRatio: '2.6 / 1',
          background: `linear-gradient(180deg, ${mixHex(a, '#ffffff', 0.55)} 0%, ${a} 40%, ${mixHex(b, '#000000', 0.35)} 100%)`,
        }}
      />
    )
  }
  return (
    <span className="absolute aspect-square" style={style}>
      <ShapeSvg kind={item.kind} colors={colors} />
    </span>
  )
}
