// Pointer gestures mapped onto the editor state. Pure, so the feel of the
// drags (sensitivity, limits, direction) is pinned down by tests.

import { clampNumber } from './render'

export type DragMode = 'zoom' | 'tilt'

type DragStart = { offsetX: number; offsetY: number; rotateX: number; rotateY: number }

/** Largest offset from the centre, in % of the canvas. */
export const OFFSET_LIMIT = 50
/** Largest tilt around X or Y, in degrees. */
export const TILT_LIMIT = 60
/** Degrees of tilt for a drag across the whole canvas. */
const TILT_PER_CANVAS = 120
/** Share of the normal sensitivity used while Shift is held. */
const PRECISION_FACTOR = 0.25

// Math.round(-0.4) is -0; normalising keeps state and tests free of negative zeros.
const round = (value: number) => Math.round(value) || 0

/**
 * @param dx Horizontal pointer travel since the gesture started, in px.
 * @param dy Vertical pointer travel since the gesture started, in px.
 * @param size On-screen size of the canvas, in px.
 * @param precision Fine control while Shift is held: a quarter of the travel.
 */
export function applyDrag(
  mode: DragMode,
  start: DragStart,
  rawDx: number,
  rawDy: number,
  size: { width: number; height: number },
  { precision = false }: { precision?: boolean } = {},
): Partial<DragStart> {
  const factor = precision ? PRECISION_FACTOR : 1
  const dx = rawDx * factor
  const dy = rawDy * factor

  if (mode === 'zoom') {
    return {
      offsetX: round(clampNumber(start.offsetX + (dx / size.width) * 100, -OFFSET_LIMIT, OFFSET_LIMIT)),
      offsetY: round(clampNumber(start.offsetY + (dy / size.height) * 100, -OFFSET_LIMIT, OFFSET_LIMIT)),
    }
  }
  // Dragging right turns the face to the right (+Y); dragging up tips the top
  // edge away from the viewer (+X), which is why dy is inverted.
  return {
    rotateX: round(clampNumber(start.rotateX - (dy / size.height) * TILT_PER_CANVAS, -TILT_LIMIT, TILT_LIMIT)),
    rotateY: round(clampNumber(start.rotateY + (dx / size.width) * TILT_PER_CANVAS, -TILT_LIMIT, TILT_LIMIT)),
  }
}

/** Pointer travel, in px, below which a press counts as a click rather than a drag. */
const TAP_TOLERANCE = 4

/** Whether a press that travelled (dx, dy) px was a tap rather than a drag. */
export function isTap(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) < TAP_TOLERANCE
}

/** A point on the tilt pad (0-1 on each axis, origin top-left) as a rotation. */
export function tiltFromPad(x: number, y: number): { rotateX: number; rotateY: number } {
  return {
    rotateX: round(clampNumber(-(y - 0.5) * 2 * TILT_LIMIT, -TILT_LIMIT, TILT_LIMIT)),
    rotateY: round(clampNumber((x - 0.5) * 2 * TILT_LIMIT, -TILT_LIMIT, TILT_LIMIT)),
  }
}

/** Inverse of tiltFromPad: where the pad handle sits for a given rotation. */
export function padFromTilt(rotateX: number, rotateY: number): { x: number; y: number } {
  return {
    x: 0.5 + rotateY / (2 * TILT_LIMIT),
    y: 0.5 - rotateX / (2 * TILT_LIMIT),
  }
}
