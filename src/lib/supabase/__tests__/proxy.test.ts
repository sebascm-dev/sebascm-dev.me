// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.hoisted(() => vi.fn())
const mockCreateServerClient = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => { auth: { getUser: typeof mockGetUser } }>(() => ({
    auth: { getUser: mockGetUser },
  }))
)

vi.mock('@supabase/ssr', () => ({ createServerClient: mockCreateServerClient }))

import { updateSession } from '../proxy'

type CookieMethods = {
  getAll: () => { name: string; value: string }[]
  setAll: (
    cookies: { name: string; value: string; options: object }[],
    headers: Record<string, string>
  ) => void
}

/** Cookie adapter that updateSession() handed to @supabase/ssr */
function cookieMethods(): CookieMethods {
  const options = mockCreateServerClient.mock.calls[0][2] as { cookies: CookieMethods }
  return options.cookies
}

const ADMIN_URL = 'https://sebascm.me/admin'

describe('updateSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SUPABASE_URL = 'https://supabase.test'
    process.env.SUPABASE_ANON_KEY = 'anon-test-key'
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
  })

  afterEach(() => {
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_ANON_KEY
  })

  it('validates the session against Supabase and returns the user', async () => {
    const user = { id: 'u1', email: 'admin@test.com' }
    mockGetUser.mockResolvedValue({ data: { user }, error: null })

    const result = await updateSession(new NextRequest(ADMIN_URL))

    expect(mockGetUser).toHaveBeenCalledTimes(1)
    expect(result.user).toEqual(user)
  })

  it('returns no user when Supabase rejects the session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid JWT' } })

    const result = await updateSession(new NextRequest(ADMIN_URL))

    expect(result.user).toBeNull()
  })

  it('exposes the incoming request cookies to Supabase', async () => {
    const request = new NextRequest(ADMIN_URL, {
      headers: { cookie: 'sb-test-auth-token=abc' },
    })

    await updateSession(request)

    expect(cookieMethods().getAll()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'sb-test-auth-token', value: 'abc' }),
      ])
    )
  })

  it('writes refreshed session cookies and no-cache headers to the response', async () => {
    mockGetUser.mockImplementation(async () => {
      // Simulates @supabase/ssr refreshing an expired access token mid-request
      cookieMethods().setAll(
        [{ name: 'sb-test-auth-token', value: 'refreshed', options: { path: '/' } }],
        { 'Cache-Control': 'private, no-store' }
      )
      return { data: { user: { id: 'u1', email: 'admin@test.com' } }, error: null }
    })

    const { response } = await updateSession(new NextRequest(ADMIN_URL))

    expect(response.cookies.get('sb-test-auth-token')?.value).toBe('refreshed')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })
})
