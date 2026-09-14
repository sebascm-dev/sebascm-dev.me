import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseEnv } from './env'

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Create one per request: it is bound to that request's cookies.
 */
export async function createClient() {
  const { url, anonKey } = getSupabaseEnv()
  const cookieStore = await cookies()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server Components cannot write cookies. That is fine: the proxy
          // refreshes the session on every /admin request before rendering.
        }
      },
    },
  })
}
