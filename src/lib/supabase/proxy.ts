import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { getSupabaseEnv } from './env'

/**
 * Refreshes the Supabase session for a request and validates it with GoTrue.
 *
 * This instance signs tokens with HS256 and publishes no JWKS, so the server
 * cannot verify them locally: getUser() asks GoTrue on every call. Never use
 * getSession() for authorization here, it only decodes the cookie.
 */
export async function updateSession(
  request: NextRequest
): Promise<{ response: NextResponse; user: User | null }> {
  const { url, anonKey } = getSupabaseEnv()
  let response = NextResponse.next({ request })

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        // Update the request too, so Server Components rendered after the
        // proxy already see the refreshed session
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
        // Responses that set auth cookies must never be cached by a CDN or proxy
        for (const [key, value] of Object.entries(headers ?? {})) {
          response.headers.set(key, value)
        }
      },
    },
  })

  const { data, error } = await supabase.auth.getUser()
  return { response, user: error ? null : data.user }
}
