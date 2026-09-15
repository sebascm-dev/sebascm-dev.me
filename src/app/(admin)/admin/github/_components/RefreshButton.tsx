'use client'

import { useTransition } from 'react'
import { IconLoader2, IconRefresh } from '@tabler/icons-react'
import { refreshGithub } from '../actions'

export function RefreshButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          await refreshGithub()
        })
      }
      disabled={isPending}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#262626] px-3 py-1.5 text-sm text-gray-200 transition-colors duration-150 hover:border-[#22d3ee]/50 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? (
        <IconLoader2 size={14} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
      ) : (
        <IconRefresh size={14} aria-hidden="true" />
      )}
      {isPending ? 'Actualizando…' : 'Actualizar'}
    </button>
  )
}
