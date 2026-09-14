import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockSignInWithPassword = vi.hoisted(() => vi.fn())
const mockSignOut = vi.hoisted(() => vi.fn())
const mockRedirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    // next/navigation's redirect() throws to stop execution
    throw new Error(`NEXT_REDIRECT:${url}`)
  })
)

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { signInWithPassword: mockSignInWithPassword, signOut: mockSignOut },
  })),
}))
vi.mock('next/navigation', () => ({ redirect: mockRedirect }))

import { login, logout } from '../auth'

const INVALID = { success: false, error: 'Credenciales incorrectas' }
const admin = { id: 'u1', email: 'admin@test.com' }

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ADMIN_EMAIL = 'admin@test.com'
  mockSignOut.mockResolvedValue({ error: null })
})

afterEach(() => {
  delete process.env.ADMIN_EMAIL
})

describe('login', () => {
  it('signs in the admin', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: admin, session: {} },
      error: null,
    })

    await expect(login('admin@test.com', 'secret')).resolves.toEqual({ success: true })
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'admin@test.com',
      password: 'secret',
    })
  })

  it('trims the email before signing in', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: admin, session: {} },
      error: null,
    })

    await login('  admin@test.com ', 'secret')

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'admin@test.com',
      password: 'secret',
    })
  })

  it('returns the generic error for wrong credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: 'invalid_credentials', status: 400, message: 'Invalid login credentials' },
    })

    await expect(login('admin@test.com', 'wrong')).resolves.toEqual(INVALID)
  })

  // Same message as wrong credentials, so the form never reveals which accounts exist
  it('signs out and returns the generic error for a valid account that is not the admin', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: 'u2', email: 'intruder@test.com' }, session: {} },
      error: null,
    })

    await expect(login('intruder@test.com', 'secret')).resolves.toEqual(INVALID)
    expect(mockSignOut).toHaveBeenCalledTimes(1)
  })

  it('rejects empty fields without calling Supabase', async () => {
    await expect(login('', '')).resolves.toEqual(INVALID)
    await expect(login('admin@test.com', '')).resolves.toEqual(INVALID)
    await expect(login('   ', 'secret')).resolves.toEqual(INVALID)

    expect(mockSignInWithPassword).not.toHaveBeenCalled()
  })

  it('asks the user to wait when Supabase rate-limits the attempts', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: 'over_request_rate_limit', status: 429, message: 'Too many requests' },
    })

    const result = await login('admin@test.com', 'secret')

    expect(result.success).toBe(false)
    expect(result).toEqual({
      success: false,
      error: expect.stringMatching(/demasiados intentos/i),
    })
  })
})

describe('logout', () => {
  it('signs out and redirects to the home page', async () => {
    await expect(logout()).rejects.toThrow('NEXT_REDIRECT:/')

    expect(mockSignOut).toHaveBeenCalledTimes(1)
    expect(mockRedirect).toHaveBeenCalledWith('/')
  })
})
