// Server-side admin guard for Server Components, Server Actions and Route Handlers.
// The proxy already blocks /admin, but every entry point checks again on its own:
// a change to the proxy matcher must never leave the panel or its actions open.
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/auth-policy'

/**
 * The signed-in user when it is the admin, otherwise null.
 * The session is validated against GoTrue, not just decoded from the cookie.
 */
export async function getAdminUser(): Promise<User | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) return null
  return isAdminEmail(data.user.email, process.env.ADMIN_EMAIL) ? data.user : null
}

/** Returns the admin user, or redirects to /login when there is none */
export async function requireAdmin(): Promise<User> {
  const user = await getAdminUser()
  if (!user) redirect('/login')
  return user
}
