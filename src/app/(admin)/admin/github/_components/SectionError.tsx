import { IconAlertTriangle } from '@tabler/icons-react'
import { GithubAuthError, GithubRateLimitError } from '@/lib/github/client'
import { RetryButton } from './RetryButton'

interface SectionErrorProps {
  title: string
  error: unknown
}

/** Friendly copy with a next step; the technical detail stays in the server logs */
function describe(error: unknown): { headline: string; detail: string } {
  if (error instanceof GithubAuthError) {
    return {
      headline: 'El token de GitHub no es válido o caducó.',
      detail: 'Renuévalo en Coolify (variable GITHUB_TOKEN) y vuelve a intentarlo.',
    }
  }
  if (error instanceof GithubRateLimitError) {
    return {
      headline: 'GitHub ha limitado las peticiones.',
      detail: 'Vuelve a intentarlo en unos minutos.',
    }
  }
  return {
    headline: 'No se pudo cargar GitHub.',
    detail: 'Puede ser un problema temporal de conexión. Vuelve a intentarlo.',
  }
}

export function SectionError({ title, error }: SectionErrorProps) {
  const { headline, detail } = describe(error)

  return (
    <section role="alert" className="rounded-xl border border-red-500/30 bg-[#0d0d0d] p-5">
      <p className="flex items-center gap-2 text-sm font-medium text-red-400">
        <IconAlertTriangle size={16} aria-hidden="true" />
        {title}: {headline}
      </p>
      <p className="mt-1 text-sm text-gray-400">{detail}</p>
      <RetryButton />
    </section>
  )
}
