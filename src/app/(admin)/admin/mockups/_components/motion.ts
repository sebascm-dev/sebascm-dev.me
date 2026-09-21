// Shared motion presets for the mockup editor. One vocabulary of springs and
// variants keeps every animation feeling like part of the same product.
//
// Rule of thumb: animate the chrome, never the canvas. The canvas is
// snapshotted by the exporter and dragged directly — a mid-animation frame
// would end up in the file, and a transition would make dragging feel laggy.

import type { Transition, Variants } from 'framer-motion'

/** Snappy spring for small UI pieces: pills, knobs, chips. */
export const SPRING: Transition = { type: 'spring', stiffness: 520, damping: 34, mass: 0.7 }

/** Softer spring for larger surfaces: panels and dialogs. */
export const SPRING_SOFT: Transition = { type: 'spring', stiffness: 360, damping: 30, mass: 0.8 }

/** Quick ease for fades, where a spring would add nothing. */
export const EASE = { duration: 0.18, ease: [0.22, 1, 0.36, 1] } as const

/** Dropdowns and popovers growing out of their trigger. */
export const popover: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: -6 },
  visible: { opacity: 1, scale: 1, y: 0, transition: SPRING_SOFT },
  exit: { opacity: 0, scale: 0.97, y: -4, transition: EASE },
}

/** Flyouts sliding out sideways from the left column. */
export const flyout: Variants = {
  hidden: { opacity: 0, x: -10, scale: 0.98 },
  visible: { opacity: 1, x: 0, scale: 1, transition: SPRING_SOFT },
  exit: { opacity: 0, x: -6, transition: EASE },
}

/** Lists whose items cascade in one after another. */
export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03, delayChildren: 0.02 } },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: SPRING },
}

/** Press feedback shared by buttons and tiles. */
export const press = { whileHover: { scale: 1.03 }, whileTap: { scale: 0.95 }, transition: SPRING } as const
