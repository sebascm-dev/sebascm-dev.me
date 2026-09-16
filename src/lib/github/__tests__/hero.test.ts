import { describe, expect, it } from 'vitest'
import { buildDailyPoints, HERO_DAYS, heroHistoryWindow, heroWindow, repoActivity, scaleActivity, yDomainMax } from '../hero'
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
  it('covers the last HERO_DAYS days ending today (Madrid)', () => {
    const window = heroWindow(new Date('2026-09-16T10:00:00Z'))
    expect(window.end).toBe('2026-09-16')
    expect(window.start).toBe('2025-09-18')
    const days = (Date.parse(window.end) - Date.parse(window.start)) / 864e5 + 1
    expect(days).toBe(HERO_DAYS)
  })
})

describe('heroHistoryWindow', () => {
  it('starts 29 days earlier so the first day already has a full 30-day range', () => {
    expect(heroHistoryWindow({ start: '2026-01-31', end: '2026-02-02' })).toEqual({
      start: '2026-01-02',
      end: '2026-02-02',
    })
  })
})

describe('buildDailyPoints', () => {
  const window = { start: '2026-01-31', end: '2026-02-02' }

  it('returns one point per day, each covering the 30 days that end on it', () => {
    const points = buildDailyPoints([], [], window)
    expect(points.map((point) => [point.start, point.end])).toEqual([
      ['2026-01-02', '2026-01-31'],
      ['2026-01-03', '2026-02-01'],
      ['2026-01-04', '2026-02-02'],
    ])
  })

  it('sums the real commits of each rolling 30-day range', () => {
    const points = buildDailyPoints(
      [
        commit('web', '2026-01-01T10:00:00Z'),
        commit('web', '2026-01-02T10:00:00Z'),
        commit('web', '2026-01-31T10:00:00Z'),
        commit('api', '2026-02-02T10:00:00Z'),
      ],
      [],
      window
    )
    expect(points.map((point) => point.commits)).toEqual([2, 1, 2])
  })

  it('lists every repo of the range by commits and flags the private ones', () => {
    const points = buildDailyPoints(
      [
        commit('web', '2026-01-20T10:00:00Z'),
        commit('api', '2026-01-21T11:00:00Z'),
        commit('api', '2026-01-22T11:00:00Z'),
        commit('secret', '2026-01-23T11:00:00Z', true),
      ],
      [],
      window
    )
    expect(points[0].commits).toBe(4)
    expect(points[0].repos).toEqual([
      { name: 'api', commits: 2, isPrivate: false },
      { name: 'secret', commits: 1, isPrivate: true },
      { name: 'web', commits: 1, isPrivate: false },
    ])
  })

  it('marks each repo only on the exact day it was created, private ones included', () => {
    const points = buildDailyPoints(
      [],
      [creation('new-app', '2026-02-01T09:00:00Z'), creation('hidden', '2026-02-01T22:30:00Z', true)],
      window
    )
    // 22:30 UTC on Feb 1st is still Feb 1st in Madrid (23:30)
    expect(points.map((point) => point.newRepos)).toEqual([[], ['new-app', 'hidden'], []])
  })
})

describe('buildDailyPoints day commits', () => {
  it('records the commits of each repo on the exact day of the point', () => {
    const points = buildDailyPoints(
      [
        commit('web', '2026-02-01T10:00:00Z'),
        commit('web', '2026-02-01T12:00:00Z'),
        commit('secret', '2026-02-01T13:00:00Z', true),
        commit('api', '2026-01-20T10:00:00Z'),
      ],
      [],
      { start: '2026-01-31', end: '2026-02-02' }
    )
    expect(points.map((point) => point.dayCommits)).toEqual([{}, { web: 2, secret: 1 }, {}])
  })
})

describe('repoActivity', () => {
  const day = (end: string, dayCommits: Record<string, number>) => ({
    start: end,
    end,
    commits: 0,
    smoothed: 0,
    repos: [],
    newRepos: [],
    dayCommits,
  })
  const points = [
    day('2026-03-01', {}),
    day('2026-03-02', {}),
    day('2026-03-03', { web: 2 }),
    day('2026-03-04', {}),
    day('2026-03-05', {}),
    day('2026-03-06', {}),
    day('2026-03-07', { web: 1, api: 4 }),
    day('2026-03-08', {}),
  ]

  it('adds up the commits and active days of the given repos', () => {
    expect(repoActivity(points, ['web'])).toMatchObject({ total: 3, activeDays: 2 })
    expect(repoActivity(points, ['web', 'api'])).toMatchObject({ total: 7, activeDays: 2 })
  })

  it('lights up every day within two days of a commit, so short bursts stay visible', () => {
    expect([...repoActivity(points, ['web']).highlighted].sort()).toEqual([
      '2026-03-01',
      '2026-03-02',
      '2026-03-03',
      '2026-03-04',
      '2026-03-05',
      '2026-03-06',
      '2026-03-07',
      '2026-03-08',
    ])
    expect([...repoActivity(points, ['api']).highlighted].sort()).toEqual([
      '2026-03-05',
      '2026-03-06',
      '2026-03-07',
      '2026-03-08',
    ])
  })

  it('sums the commits per 7-day block, from the first point, for the mini bar chart', () => {
    // 8 points: one full week plus one extra day
    expect(repoActivity(points, ['web']).weekly).toEqual([3, 0])
    expect(repoActivity(points, ['web', 'api']).weekly).toEqual([7, 0])
  })

  it('is empty for a repo without commits', () => {
    const activity = repoActivity(points, ['ghost'])
    expect(activity).toMatchObject({ total: 0, activeDays: 0, weekly: [0, 0] })
    expect(activity.highlighted.size).toBe(0)
  })
})

describe('buildDailyPoints smoothing', () => {
  const window = { start: '2026-03-01', end: '2026-03-31' }
  const smoothedOn = (points: ReturnType<typeof buildDailyPoints>, day: string) =>
    points.find((point) => point.end === day)?.smoothed ?? NaN

  it('turns a single commit into a symmetric bump centred on its day, without steps', () => {
    // Window long enough that neither side of the bump touches the unknown future
    const points = buildDailyPoints([commit('web', '2026-03-16T10:00:00Z')], [], { ...window, end: '2026-04-30' })
    const peak = smoothedOn(points, '2026-03-16')

    expect(Math.max(...points.map((point) => point.smoothed))).toBe(peak)
    expect(smoothedOn(points, '2026-03-13')).toBeLessThan(peak)
    expect(smoothedOn(points, '2026-03-10')).toBeLessThan(smoothedOn(points, '2026-03-13'))
    expect(smoothedOn(points, '2026-03-13')).toBeCloseTo(smoothedOn(points, '2026-03-19'))
    expect(smoothedOn(points, '2026-03-01')).toBeLessThan(peak * 0.1)
  })

  it('reads as commits per 30 days, also on the last day where the future is unknown', () => {
    // One commit every day, history included
    const daily = Array.from({ length: 60 }, (_, i) => {
      const day = new Date(Date.parse('2026-02-01T10:00:00Z') + i * 864e5).toISOString()
      return commit('web', day)
    })
    const points = buildDailyPoints(daily, [], window)

    expect(smoothedOn(points, '2026-03-15')).toBeCloseTo(30)
    expect(smoothedOn(points, '2026-03-31')).toBeCloseTo(30)
  })
})

describe('scaleActivity', () => {
  const point = (smoothed: number) => ({
    start: '2026-01-01',
    end: '2026-01-30',
    commits: Math.round(smoothed),
    smoothed,
    repos: [],
    newRepos: [],
    dayCommits: {},
  })

  it('compresses big differences with a square root, keeping visible relief', () => {
    const [high, , low] = scaleActivity([point(100), point(0), point(5)])
    // Linear ratio is 20x; the offset square root keeps it between 3x and 6x
    expect(high.level / low.level).toBeGreaterThan(3)
    expect(high.level / low.level).toBeLessThan(6)
  })

  it('rises gently from zero, so near-zero activity does not jump off the baseline', () => {
    const [tiny] = scaleActivity([point(0.01)])
    expect(tiny.level).toBeGreaterThan(0)
    expect(tiny.level).toBeLessThan(0.02)
  })

  it('draws the smoothed value, keeps idle ranges at zero and leaves the raw counts untouched', () => {
    const points = scaleActivity([point(0), point(9)])
    expect(points[0].level).toBe(0)
    expect(points[1].level).toBeCloseTo(Math.sqrt(9.25) - 0.5)
    expect(points.map((p) => p.commits)).toEqual([0, 9])
  })

  it('returns an empty list for no points', () => {
    expect(scaleActivity([])).toEqual([])
  })
})

describe('yDomainMax', () => {
  it('leaves headroom above the highest level', () => {
    expect(yDomainMax([1, 4, 2])).toBeCloseTo(4 * 1.1)
  })

  it('uses a floor so a quiet year does not fill the hero', () => {
    const floor = (Math.sqrt(10.25) - 0.5) * 1.1
    expect(yDomainMax([0.2, 0.5])).toBeCloseTo(floor)
    expect(yDomainMax([])).toBeCloseTo(floor)
  })
})
