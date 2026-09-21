// Undo/redo as an immutable past–present–future stack.

export type History<T> = {
  past: T[]
  present: T
  future: T[]
}

const DEFAULT_LIMIT = 100

export function createHistory<T>(initial: T): History<T> {
  return { past: [], present: initial, future: [] }
}

/**
 * Records `next` as the new present.
 *
 * @param coalesce Replace the present instead of pushing a new step — used for
 *   the stream of changes a single slider drag or gesture produces.
 * @param limit Oldest steps beyond this count are forgotten.
 */
export function commit<T>(
  history: History<T>,
  next: T,
  { coalesce, limit = DEFAULT_LIMIT }: { coalesce: boolean; limit?: number },
): History<T> {
  if (Object.is(next, history.present)) return history
  if (coalesce && history.past.length > 0) return { past: history.past, present: next, future: [] }
  return { past: [...history.past, history.present].slice(-limit), present: next, future: [] }
}

export function undo<T>(history: History<T>): History<T> {
  if (history.past.length === 0) return history
  return {
    past: history.past.slice(0, -1),
    present: history.past[history.past.length - 1],
    future: [history.present, ...history.future],
  }
}

export function redo<T>(history: History<T>): History<T> {
  if (history.future.length === 0) return history
  return {
    past: [...history.past, history.present],
    present: history.future[0],
    future: history.future.slice(1),
  }
}

export const canUndo = <T>(history: History<T>) => history.past.length > 0
export const canRedo = <T>(history: History<T>) => history.future.length > 0
