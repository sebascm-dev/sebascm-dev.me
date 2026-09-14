// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server'
// NOTE: Next.js 16 docs call this `unstable_doesProxyMatch` but this version ships
// the function as `unstable_doesMiddlewareMatch` (the middleware→proxy rename is
// partially rolled out — file convention changed but testing util name hasn't)

const mockUpdateSession = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/proxy', () => ({
  updateSession: mockUpdateSession,
}))

import { config, proxy } from '../proxy'

/** Whether the proxy matcher runs for a given URL */
function matches(url: string): boolean {
  return unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })
}

describe('proxy — matcher config', () => {
  it('matches /admin exactly', () => {
    expect(matches('/admin')).toBe(true)
  })

  it('matches /admin/settings (nested path)', () => {
    expect(matches('/admin/settings')).toBe(true)
  })

  it('does NOT match /login', () => {
    expect(matches('/login')).toBe(false)
  })

  it('does NOT match / (root)', () => {
    expect(matches('/')).toBe(false)
  })

  it('does NOT match /about', () => {
    expect(matches('/about')).toBe(false)
  })
})

describe('proxy — admin gate', () => {
  const ADMIN_REQUEST_URL = 'https://sebascm.me/admin/profile?tab=cv'

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ADMIN_EMAIL = 'admin@test.com'
  })

  afterEach(() => {
    delete process.env.ADMIN_EMAIL
  })

  it('lets the admin through with the session response untouched', async () => {
    const sessionResponse = NextResponse.next()
    mockUpdateSession.mockResolvedValue({
      response: sessionResponse,
      user: { id: 'u1', email: 'admin@test.com' },
    })

    const result = await proxy(new NextRequest(ADMIN_REQUEST_URL))

    expect(result).toBe(sessionResponse)
  })

  it('redirects to /login when there is no session', async () => {
    mockUpdateSession.mockResolvedValue({ response: NextResponse.next(), user: null })

    const result = await proxy(new NextRequest(ADMIN_REQUEST_URL))

    expect(result.status).toBe(307)
    expect(result.headers.get('location')).toBe('https://sebascm.me/login')
  })

  it('redirects to /login when the user is not the admin', async () => {
    mockUpdateSession.mockResolvedValue({
      response: NextResponse.next(),
      user: { id: 'u2', email: 'intruder@test.com' },
    })

    const result = await proxy(new NextRequest(ADMIN_REQUEST_URL))

    expect(result.status).toBe(307)
    expect(result.headers.get('location')).toBe('https://sebascm.me/login')
  })

  // Otherwise a token refresh that happened during this request would be lost
  it('keeps cookies written during the session refresh on the redirect', async () => {
    const sessionResponse = NextResponse.next()
    sessionResponse.cookies.set('sb-test-auth-token', '', { path: '/', maxAge: 0 })
    mockUpdateSession.mockResolvedValue({ response: sessionResponse, user: null })

    const result = await proxy(new NextRequest(ADMIN_REQUEST_URL))

    expect(result.cookies.get('sb-test-auth-token')).toBeDefined()
  })
})
