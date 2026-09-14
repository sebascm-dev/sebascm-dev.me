/**
 * Authorization rules shared by the proxy, Server Components and Server Actions.
 * Pure functions only, so they run in any runtime and are trivial to test.
 */

/** Normalizes an email for comparison: trimmed and lower-cased */
function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase()
}

/**
 * Whether `email` belongs to the single admin configured in ADMIN_EMAIL.
 * Fails closed: when no admin is configured, nobody is an admin.
 */
export function isAdminEmail(
  email: string | null | undefined,
  adminEmail: string | null | undefined
): boolean {
  const expected = normalizeEmail(adminEmail)
  if (!expected) return false
  return normalizeEmail(email) === expected
}
