import { describe, expect, it } from 'vitest'
import { buildWeeklyPoints, heroWindow, HERO_WEEKS, scaleActivity, yDomainMax } from '../hero'
import type { Commit, RepoCreation } from '../types'

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

const creation = (repo: string, createdAt: string, isPrivate = false): RepoCreation => ({
  repo,
  isPrivate,
  url: 'https://example.com',
  createdAt,
})

describe('heroWindow', () => {
  it('covers exactly HERO_WEEKS full weeks ending today (Madrid)', () => {
    const window = heroWindow(new Date('2026-09-16T10:00:00Z'))
    expect(window.end).toBe('2026-09-16')
    expect(window.start).toBe('2025-09-18')
    const days = (Date.parse(window.end) - Date.parse(window.start)) / 864e5 + 1
    expect(days).toBe(HERO_WEEKS * 7)
  })
})

describe('buildWeeklyPoints', () => {
  const window = { start: '2026-01-01', end: '2026-01-14' }

  it('splits the window into complete 7-day buckets, no partial trailing bucket', () => {
    const points = buildWeeklyPoints([], [], window)
    expect(points).toHaveLength(2)
    expect(points[0]).toMatchObject({ start: '2026-01-01', end: '2026-01-07', commits: 0 })
    expect(points[1]).toMatchObject({ start: '2026-01-08', end: '2026-01-14', commits: 0 })
  })

  it('counts real commits per week and ignores commits outside the window', () => {
    const points = buildWeeklyPoints(
      [
        commit('web', '2026-01-02T10:00:00Z'),
        commit('web', '2026-01-03T10:00:00Z'),
        commit('api', '2026-01-10T10:00:00Z'),
        commit('web', '2025-12-20T10:00:00Z'),
      ],
      [],
      window
    )
    expect(points.map((point) => point.commits)).toEqual([2, 1])
  })

  it('lists public repos by commits and never exposes private repo names', () => {
    const points = buildWeeklyPoints(
      [
        commit('web', '2026-01-02T10:00:00Z'),
        commit('api', '2026-01-02T11:00:00Z'),
        commit('api', '2026-01-03T11:00:00Z'),
        commit('secret', '2026-01-04T11:00:00Z', true),
      ],
      [],
      window
    )
    expect(points[0].commits).toBe(4)
    expect(points[0].privateCommits).toBe(1)
    expect(points[0].repos).toEqual([
      { name: 'api', commits: 2 },
      { name: 'web', commits: 1 },
    ])
    expect(JSON.stringify(points)).not.toContain('secret')
  })

  it('marks public repos created during the week', () => {
    const points = buildWeeklyPoints(
      [],
      [creation('new-app', '2026-01-09T09:00:00Z'), creation('hidden', '2026-01-09T09:00:00Z', true)],
      window
    )
    expect(points[0].newRepos).toEqual([])
    expect(points[1].newRepos).toEqual(['new-app'])
  })
})

describe('scaleActivity', () => {
  const point = (commits: number) => ({
    start: '2026-01-01',
    end: '2026-01-07',
    commits,
    privateCommits: 0,
    repos: [],
    newRepos: [],
  })

  it('compresses big differences logarithmically', () => {
    const [high, , low] = scaleActivity([point(100), point(0), point(5)], { smooth: false })
    // Linear ratio is 20x; the log scale keeps it under 3x
    expect(high.level / low.level).toBeLessThan(3)
    expect(high.level).toBeGreaterThan(low.level)
  })

  it('keeps idle weeks at zero and never goes negative', () => {
    const points = scaleActivity([point(0), point(0), point(40), point(0), point(0)])
    expect(points[0].level).toBe(0)
    points.forEach((p) => expect(p.level).toBeGreaterThanOrEqual(0))
  })

  it('smooths neighbours without changing the raw commit counts', () => {
    const points = scaleActivity([point(0), point(10), point(0)])
    expect(points[0].level).toBeGreaterThan(0)
    expect(points[1].level).toBeLessThan(Math.log1p(10))
    expect(points.map((p) => p.commits)).toEqual([0, 10, 0])
  })

  it('returns an empty list for no points', () => {
    expect(scaleActivity([])).toEqual([])
  })
})

describe('yDomainMax', () => {
  it('leaves headroom above the highest level', () => {
    expect(yDomainMax([1, 4, 2])).toBeCloseTo(4 * 1.6)
  })

  it('uses a floor so a quiet year does not fill the hero', () => {
    expect(yDomainMax([0.2, 0.5])).toBeCloseTo(Math.log1p(10) * 1.6)
    expect(yDomainMax([])).toBeCloseTo(Math.log1p(10) * 1.6)
  })
})
