import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockReplace = vi.hoisted(() => vi.fn())
const mockRefresh = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh }),
  usePathname: () => '/admin/github',
}))

import { SectionError } from '../SectionError'
import { EmptyActivity } from '../EmptyActivity'
import { RangeTransitionProvider } from '../RangeTransition'
import { GithubAuthError, GithubRateLimitError, GithubUnavailableError } from '@/lib/github/client'

describe('SectionError', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    [new GithubAuthError('Bad credentials'), /El token de GitHub no es válido o caducó/],
    [new GithubRateLimitError('limit'), /GitHub ha limitado las peticiones/],
    [new GithubUnavailableError('502'), /No se pudo cargar GitHub/],
    [new Error('unexpected'), /No se pudo cargar GitHub/],
  ])('explains %s with a next step', (error, message) => {
    render(<SectionError title="Actividad" error={error} />)

    expect(screen.getByRole('alert')).toHaveTextContent(message)
  })

  it('never shows the technical message', () => {
    render(<SectionError title="Actividad" error={new Error('ECONNRESET at socket 10.0.0.1')} />)

    expect(screen.queryByText(/ECONNRESET/)).not.toBeInTheDocument()
  })

  it('names the token variable to renew on auth errors', () => {
    render(<SectionError title="Actividad" error={new GithubAuthError('x')} />)

    expect(screen.getByRole('alert')).toHaveTextContent('GITHUB_TOKEN')
  })

  it('retries by refreshing the route', async () => {
    const user = userEvent.setup()
    render(<SectionError title="Actividad" error={new GithubUnavailableError('x')} />)

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })
})

describe('EmptyActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('explains the empty range and offers the next wider one', async () => {
    const user = userEvent.setup()
    render(
      <RangeTransitionProvider>
        <EmptyActivity range="7d" lastCommitDate="2026-09-05" />
      </RangeTransitionProvider>
    )

    expect(screen.getByText('Sin commits en los últimos 7 días')).toBeInTheDocument()
    expect(screen.getByText('Tu último commit fue el 5 de septiembre.')).toBeInTheDocument()

    // 30d is the default range, so the param is dropped
    await user.click(screen.getByRole('button', { name: 'Ver 30 días' }))
    expect(mockReplace).toHaveBeenCalledWith('/admin/github', { scroll: false })
  })

  it('widens 30 days to 90 days', async () => {
    const user = userEvent.setup()
    render(
      <RangeTransitionProvider>
        <EmptyActivity range="30d" lastCommitDate={null} />
      </RangeTransitionProvider>
    )

    await user.click(screen.getByRole('button', { name: 'Ver 90 días' }))
    expect(mockReplace).toHaveBeenCalledWith('/admin/github?range=90d', { scroll: false })
  })

  it('has no wider range for 12 months and omits the date when unknown', () => {
    render(
      <RangeTransitionProvider>
        <EmptyActivity range="12m" lastCommitDate={null} />
      </RangeTransitionProvider>
    )

    expect(screen.getByText('Sin commits en los últimos 12 meses')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByText(/Tu último commit/)).not.toBeInTheDocument()
  })
})
