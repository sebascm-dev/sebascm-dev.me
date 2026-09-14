import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockCreateServerClient = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => { __brand: string }>(() => ({ __brand: 'server-client' }))
)
const mockCookieStore = vi.hoisted(() => ({
  getAll: vi.fn(),
  set: vi.fn(),
}))

vi.mock('@supabase/ssr', () => ({ createServerClient: mockCreateServerClient }))
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => mockCookieStore) }))

import { createClient } from '../server'

type CookieMethods = {
  getAll: () => unknown
  setAll: (cookies: { name: string; value: string; options: object }[]) => void
}

/** Cookie adapter that createClient() handed to @supabase/ssr */
function capturedCookieMethods(): CookieMethods {
  const options = mockCreateServerClient.mock.calls[0][2] as { cookies: CookieMethods }
  return options.cookies
}

describe('supabase/server createClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SUPABASE_URL = 'https://supabase.test'
    process.env.SUPABASE_ANON_KEY = 'anon-test-key'
  })

  afterEach(() => {
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_ANON_KEY
  })

  it('creates the client with the Supabase URL and anon key from the environment', async () => {
    await createClient()

    expect(mockCreateServerClient).toHaveBeenCalledWith(
      'https://supabase.test',
      'anon-test-key',
      expect.objectContaining({ cookies: expect.any(Object) })
    )
  })

  it('reads cookies from the Next.js cookie store', async () => {
    mockCookieStore.getAll.mockReturnValue([{ name: 'sb-test-auth-token', value: 'abc' }])

    await createClient()

    expect(capturedCookieMethods().getAll()).toEqual([
      { name: 'sb-test-auth-token', value: 'abc' },
    ])
  })

  it('writes refreshed cookies to the cookie store', async () => {
    await createClient()

    capturedCookieMethods().setAll([
      { name: 'sb-test-auth-token', value: 'new', options: { path: '/' } },
    ])

    expect(mockCookieStore.set).toHaveBeenCalledWith('sb-test-auth-token', 'new', { path: '/' })
  })

  // Server Components cannot set cookies; the proxy refreshes the session instead
  it('does not throw when cookies cannot be written during a Server Component render', async () => {
    mockCookieStore.set.mockImplementation(() => {
      throw new Error('Cookies can only be modified in a Server Action or Route Handler')
    })

    await createClient()

    expect(() =>
      capturedCookieMethods().setAll([{ name: 'a', value: 'b', options: {} }])
    ).not.toThrow()
  })

  it('fails with a clear message when the Supabase environment is missing', async () => {
    delete process.env.SUPABASE_URL

    await expect(createClient()).rejects.toThrow(/SUPABASE_URL/)
  })
})
