// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Commit, RepoCreation } from '@/lib/github/types'

const mockFetchHeroCommits = vi.hoisted(() => vi.fn())

vi.mock('@/lib/github/queries', () => ({ fetchHeroCommits: mockFetchHeroCommits }))

import { GET } from '../route'

const commit = (repo: string, committedAt: string, isPrivate = false): Commit => ({
  oid: `${repo}-${committedAt}`,
  repo,
  isPrivate,
  branch: 'main',
  committedAt,
  message: 'msg',
  url: 'https://example.com',
  additions: 1,
  deletions: 0,
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-16T10:00:00Z'))
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('GET /api/github/activity', () => {
  it('returns 52 weekly points for the last 52 weeks, without private repo names', async () => {
    const creations: RepoCreation[] = []
    mockFetchHeroCommits.mockResolvedValue({
      commits: [commit('web', '2026-09-15T10:00:00Z'), commit('secret', '2026-09-15T11:00:00Z', true)],
      repoCreations: creations,
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockFetchHeroCommits).toHaveBeenCalledWith({ start: '2025-09-18', end: '2026-09-16' })
    expect(body.points).toHaveLength(52)
    expect(body.points.at(-1)).toMatchObject({
      end: '2026-09-16',
      commits: 2,
      privateCommits: 1,
      repos: [{ name: 'web', commits: 1 }],
    })
    expect(JSON.stringify(body)).not.toContain('secret')
  })

  it('answers 500 with an empty list when GitHub fails', async () => {
    mockFetchHeroCommits.mockRejectedValue(new Error('GitHub responded 502'))

    const response = await GET()

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ points: [] })
    expect(console.error).toHaveBeenCalled()
  })
})
