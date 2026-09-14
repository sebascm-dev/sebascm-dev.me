/**
 * Supabase connection settings, read on the server only.
 *
 * The anon key is public by design, but every auth call in this app goes
 * through the Next.js server, so the browser bundle never needs it and the
 * variables are deliberately not prefixed with NEXT_PUBLIC_.
 */
export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    const missing = [!url && 'SUPABASE_URL', !anonKey && 'SUPABASE_ANON_KEY']
      .filter(Boolean)
      .join(', ')
    throw new Error(`${missing} is not set. Copy env.example to .env.local and fill it in.`)
  }

  return { url, anonKey }
}
