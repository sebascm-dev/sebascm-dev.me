'use client' // Error boundaries must be Client Components

import { useEffect } from 'react'
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react'

interface GithubErrorProps {
  error: Error & { digest?: string }
  retry: () => void
}

/**
 * Last-resort boundary for the whole route. Section-level failures are handled
 * inside each section; this only catches what escapes them. The technical
 * message is never shown (in production it is generic anyway): the digest
 * links the report to the server logs.
 */
export default function GithubError({ error, retry }: GithubErrorProps) {
  useEffect(() => {
    console.error('[admin/github] route error', error.digest ?? '', error)
  }, [error])

  return (
    <div role="alert" className="flex min-h-[400px] flex-col items-center justify-center gap-3 text-center">
      <p className="flex items-center gap-2 text-sm font-medium text-red-400">
        <IconAlertTriangle size={18} aria-hidden="true" />
        No se pudo cargar la página de GitHub.
      </p>
      <p className="max-w-sm text-sm text-gray-400">
        Vuelve a intentarlo. Si el problema continúa, revisa que <code className="text-gray-200">GITHUB_TOKEN</code> siga
        siendo válido en Coolify.
      </p>
      {error.digest && <p className="text-xs text-gray-400">Referencia: {error.digest}</p>}
      <button
        type="button"
        onClick={() => retry()}
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#262626] px-4 py-2 text-sm text-gray-200 transition-colors duration-150 hover:border-[#22d3ee]/50 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
      >
        <IconRefresh size={14} aria-hidden="true" />
        Reintentar
      </button>
    </div>
  )
}
