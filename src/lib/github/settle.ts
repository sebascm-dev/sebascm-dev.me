export type Settled<T> = { ok: true; value: T } | { ok: false; error: unknown }

/** Turns a promise into a result object, so components can branch without try/catch around JSX */
export function settle<T>(promise: Promise<T>): Promise<Settled<T>> {
  return promise.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error })
  )
}
