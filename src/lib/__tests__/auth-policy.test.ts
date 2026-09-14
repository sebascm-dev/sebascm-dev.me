import { describe, it, expect } from 'vitest'
import { isAdminEmail } from '../auth-policy'

describe('isAdminEmail', () => {
  it('accepts the configured admin email', () => {
    expect(isAdminEmail('admin@test.com', 'admin@test.com')).toBe(true)
  })

  it('ignores case and surrounding whitespace on both sides', () => {
    expect(isAdminEmail('  Admin@Test.COM ', 'admin@test.com ')).toBe(true)
  })

  it('rejects a different email', () => {
    expect(isAdminEmail('intruder@test.com', 'admin@test.com')).toBe(false)
  })

  it('rejects a user without an email', () => {
    expect(isAdminEmail(undefined, 'admin@test.com')).toBe(false)
    expect(isAdminEmail(null, 'admin@test.com')).toBe(false)
  })

  // Fail closed: a missing ADMIN_EMAIL must never let every account in
  it('rejects everyone when ADMIN_EMAIL is not configured', () => {
    expect(isAdminEmail('admin@test.com', undefined)).toBe(false)
    expect(isAdminEmail('admin@test.com', '')).toBe(false)
    expect(isAdminEmail('', '')).toBe(false)
  })
})
