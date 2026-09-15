'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { IconRefresh } from '@tabler/icons-react'

/** Re-renders the route; failed GitHub responses are never cached, so this retries the request */
export function RetryButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={isPending}
      className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#262626] px-3 py-1.5 text-sm text-gray-200 transition-colors duration-150 hover:border-[#22d3ee]/50 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <IconRefresh size={14} aria-hidden="true" />
      {isPending ? 'Reintentando…' : 'Reintentar'}
    </button>
  )
}
