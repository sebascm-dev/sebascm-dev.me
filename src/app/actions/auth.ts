'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/auth-policy'

export type LoginResult = { success: true } | { success: false; error: string }

// One message for a wrong email, a wrong password and a non-admin account,
// so the form never reveals which accounts exist
const INVALID_CREDENTIALS: LoginResult = {
  success: false,
  error: 'Credenciales incorrectas',
}

const RATE_LIMITED: LoginResult = {
  success: false,
  error: 'Demasiados intentos. Espera unos minutos y vuelve a probar.',
}

/**
 * Signs the admin in with email and password.
 * Server Action arguments come from the client, so they are treated as untrusted.
 */
export async function login(email: string, password: string): Promise<LoginResult> {
  if (typeof email !== 'string' || typeof password !== 'string') {
    return INVALID_CREDENTIALS
  }

  const normalizedEmail = email.trim()
  if (!normalizedEmail || !password) return INVALID_CREDENTIALS

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  })

  if (error) {
    const rateLimited = error.status === 429 || error.code === 'over_request_rate_limit'
    return rateLimited ? RATE_LIMITED : INVALID_CREDENTIALS
  }

  // A valid account that is not the admin must not keep a session
  if (!isAdminEmail(data.user?.email, process.env.ADMIN_EMAIL)) {
    await supabase.auth.signOut()
    return INVALID_CREDENTIALS
  }

  return { success: true }
}

/** Ends the session and sends the user back to the public site */
export async function logout(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
