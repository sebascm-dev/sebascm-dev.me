import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRequireAdmin = vi.hoisted(() => vi.fn())
const mockUpdateTag = vi.hoisted(() => vi.fn())

vi.mock('@/lib/auth', () => ({ requireAdmin: mockRequireAdmin }))
vi.mock('next/cache', () => ({ updateTag: mockUpdateTag }))

import { refreshGithub } from '../actions'

describe('refreshGithub', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('expires the cached GitHub data for the admin', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'u1', email: 'admin@test.com' })

    await refreshGithub()

    expect(mockUpdateTag).toHaveBeenCalledWith('github')
  })

  it('does not touch the cache when the user is not the admin', async () => {
    // requireAdmin() redirects by throwing
    mockRequireAdmin.mockRejectedValue(new Error('NEXT_REDIRECT:/login'))

    await expect(refreshGithub()).rejects.toThrow('NEXT_REDIRECT')
    expect(mockUpdateTag).not.toHaveBeenCalled()
  })
})
