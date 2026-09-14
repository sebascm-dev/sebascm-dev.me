'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { login, type LoginResult } from '@/app/actions/auth'
import AnimatedInput from '@/components/ui/AnimatedInput'

type FormStatus = 'idle' | 'pending' | 'error'

/**
 * Login form for the hidden admin panel.
 * - Dark card with cyan accent
 * - Same error message for wrong email AND wrong password (no user enumeration)
 * - Auto-focus on email field via autoFocus attribute
 */
export default function LoginForm() {
  const router = useRouter()
  const passwordRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<FormStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('pending')
    setErrorMsg('')

    let result: LoginResult
    try {
      result = await login(email, password)
    } catch {
      // The Server Action never ran: network down or server unavailable
      setStatus('error')
      setErrorMsg('No se pudo conectar. Inténtalo de nuevo.')
      return
    }

    if (!result.success) {
      setStatus('error')
      setErrorMsg(result.error)
      // Clear password, keep email
      setPassword('')
      if (passwordRef.current) passwordRef.current.focus()
      return
    }

    router.push('/admin')
    // Refresh so Server Components re-render with the new session cookies
    router.refresh()
  }

  const isPending = status === 'pending'

  return (
    <div
      className="w-full max-w-sm rounded-2xl p-8"
      style={{
        background: 'linear-gradient(145deg, #141414 0%, #0f0f0f 100%)',
        boxShadow: '0 0 0 1px rgba(34,211,238,0.1), 0 0 60px rgba(34,211,238,0.06), 0 24px 48px rgba(0,0,0,0.4)',
      }}
    >
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#22d3ee] mb-2">
          sebascm.dev
        </p>
        <h1 className="text-2xl font-semibold text-white leading-tight">
          Bienvenido de vuelta
        </h1>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-medium tracking-wide text-zinc-400 mb-1.5"
          >
            Email
          </label>
          <AnimatedInput
            id="email"
            type="email"
            autoFocus
            autoComplete="email"
            required
            disabled={isPending}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="w-full rounded-lg px-4 py-2.5 bg-zinc-900 text-white text-sm border border-zinc-800 focus:border-[#22d3ee]"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-medium tracking-wide text-zinc-400 mb-1.5"
          >
            Contraseña
          </label>
          <AnimatedInput
            id="password"
            type="password"
            ref={passwordRef}
            autoComplete="current-password"
            required
            disabled={isPending}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg px-4 py-2.5 bg-zinc-900 text-white text-sm border border-zinc-800 focus:border-[#22d3ee] disabled:opacity-40"
          />
        </div>

        {status === 'error' && (
          <p
            role="alert"
            className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-center"
          >
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full mt-2 py-2.5 rounded-lg text-sm font-semibold text-[#0a0a0a] bg-[#22d3ee] hover:bg-[#06b6d4] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
          style={{ boxShadow: isPending ? 'none' : '0 0 24px rgba(34,211,238,0.25)' }}
        >
          {isPending ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
