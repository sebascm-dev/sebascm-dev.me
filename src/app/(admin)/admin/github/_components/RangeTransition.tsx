'use client'

import { createContext, useCallback, useContext, useMemo, useTransition, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { DEFAULT_RANGE } from '@/lib/github/range'
import type { RangeKey } from '@/lib/github/types'

interface RangeTransitionValue {
  isPending: boolean
  changeRange: (range: RangeKey) => void
}

const RangeTransitionContext = createContext<RangeTransitionValue | null>(null)

/** Shares one navigation transition between the range controls and the dimmed content */
export function RangeTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const changeRange = useCallback(
    (range: RangeKey) => {
      // The default range keeps a clean URL
      const href = range === DEFAULT_RANGE ? pathname : `${pathname}?range=${range}`
      startTransition(() => {
        router.replace(href, { scroll: false })
      })
    },
    [pathname, router]
  )

  const value = useMemo(() => ({ isPending, changeRange }), [isPending, changeRange])

  return <RangeTransitionContext.Provider value={value}>{children}</RangeTransitionContext.Provider>
}

export function useRangeTransition(): RangeTransitionValue {
  const value = useContext(RangeTransitionContext)
  if (!value) throw new Error('useRangeTransition must be used inside RangeTransitionProvider')
  return value
}

/** Keeps the previous render visible at reduced opacity while a new range loads */
export function PendingContent({ children }: { children: ReactNode }) {
  const { isPending } = useRangeTransition()

  return (
    <div
      aria-busy={isPending || undefined}
      className={`transition-opacity duration-200 motion-reduce:transition-none ${isPending ? 'opacity-60' : 'opacity-100'}`}
    >
      {children}
    </div>
  )
}
