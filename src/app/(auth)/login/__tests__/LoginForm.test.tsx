import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Vitest hoists vi.mock calls — use vi.hoisted() for variables used in factories
const mockLogin = vi.hoisted(() => vi.fn())
const mockRouterPush = vi.hoisted(() => vi.fn())
const mockRouterRefresh = vi.hoisted(() => vi.fn())

vi.mock('@/app/actions/auth', () => ({
  login: mockLogin,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush, refresh: mockRouterRefresh }),
}))

import LoginForm from '../LoginForm'

/** Fills both fields and submits the form */
async function submit(email: string, password: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/email/i), email)
  await user.type(screen.getByLabelText(/contraseña/i), password)
  await user.click(screen.getByRole('button'))
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders email field, password field, and submit button', () => {
    render(<LoginForm />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })

  it('disables button and shows "Entrando…" while pending', async () => {
    // login never resolves — stays pending
    mockLogin.mockReturnValue(new Promise(() => {}))

    render(<LoginForm />)
    await submit('admin@test.com', 'password123')

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeDisabled()
      expect(screen.getByRole('button')).toHaveTextContent(/entrando/i)
    })
  })

  it('sends the typed credentials to the login action', async () => {
    mockLogin.mockResolvedValue({ success: true })

    render(<LoginForm />)
    await submit('admin@test.com', 'password123')

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin@test.com', 'password123')
    })
  })

  it('shows the error from the action and clears the password on failure', async () => {
    mockLogin.mockResolvedValue({ success: false, error: 'Credenciales incorrectas' })

    render(<LoginForm />)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/contraseña/i)
    await submit('admin@test.com', 'wrongpassword')

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/credenciales incorrectas/i)
    })

    // Password cleared, email kept
    expect(passwordInput).toHaveValue('')
    expect(emailInput).toHaveValue('admin@test.com')
    expect(mockRouterPush).not.toHaveBeenCalled()
  })

  it('shows a connection error when the login action cannot be reached', async () => {
    mockLogin.mockRejectedValue(new Error('Failed to fetch'))

    render(<LoginForm />)
    await submit('admin@test.com', 'password123')

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/no se pudo conectar/i)
    })
    expect(screen.getByRole('button')).not.toBeDisabled()
  })

  it('redirects to /admin on successful login', async () => {
    mockLogin.mockResolvedValue({ success: true })

    render(<LoginForm />)
    await submit('admin@test.com', 'correctpassword')

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/admin')
    })
    // Refresh so Server Components re-render with the new session cookies
    expect(mockRouterRefresh).toHaveBeenCalled()
  })
})
