import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockGetUser = vi.hoisted(() => vi.fn())
const mockRedirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    // next/navigation's redirect() throws to stop rendering
    throw new Error(`NEXT_REDIRECT:${url}`)
  })
)

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
}))
vi.mock('next/navigation', () => ({ redirect: mockRedirect }))

import { getAdminUser, requireAdmin } from '../auth'

const admin = { id: 'u1', email: 'admin@test.com' }

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ADMIN_EMAIL = 'admin@test.com'
})

afterEach(() => {
  delete process.env.ADMIN_EMAIL
})

describe('getAdminUser', () => {
  it('returns the user when the session belongs to the admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: admin }, error: null })

    await expect(getAdminUser()).resolves.toEqual(admin)
  })

  it('returns null when there is no session', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Auth session missing!' },
    })

    await expect(getAdminUser()).resolves.toBeNull()
  })

  // Signups are disabled, but a stray account must still never reach the admin panel
  it('returns null for an authenticated user who is not the admin', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u2', email: 'intruder@test.com' } },
      error: null,
    })

    await expect(getAdminUser()).resolves.toBeNull()
  })

  it('returns null when ADMIN_EMAIL is not configured', async () => {
    delete process.env.ADMIN_EMAIL
    mockGetUser.mockResolvedValue({ data: { user: admin }, error: null })

    await expect(getAdminUser()).resolves.toBeNull()
  })
})

describe('requireAdmin', () => {
  it('returns the admin user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: admin }, error: null })

    await expect(requireAdmin()).resolves.toEqual(admin)
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('redirects to /login when there is no admin session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT:/login')
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })
})
