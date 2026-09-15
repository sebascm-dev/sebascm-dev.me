import { describe, it, expect } from 'vitest'
import {
  activityLevel,
  bestStreak,
  bucketByDay,
  buildFeed,
  computeDelta,
  currentStreak,
  FEED_LIMIT,
  sparkline,
  summarizeActivity,
  weekdayCounts,
} from '../activity'
import { getRangeWindows } from '../range'
import type { ActivityData, Commit, DayCount, PullRequest, RangeKey } from '../types'

const NOW = new Date('2026-09-15T10:00:00Z')

function commit(repo: string, committedAt: string, overrides: Partial<Commit> = {}): Commit {
  return {
    oid: `${repo}-${committedAt}`,
    repo,
    isPrivate: false,
    branch: 'main',
    committedAt,
    message: 'chore: work',
    url: `https://github.com/sebascm-dev/${repo}/commit/x`,
    additions: 1,
    deletions: 0,
    ...overrides,
  }
}

function data(overrides: Partial<ActivityData> = {}): ActivityData {
  return {
    commits: [],
    pullRequests: [],
    releases: [],
    repoCreations: [],
    totalRepos: 4,
    fetchedAt: '2026-09-15T09:58:00Z',
    ...overrides,
  }
}

function days(counts: number[], end = '2026-09-15'): DayCount[] {
  const endMs = Date.parse(`${end}T00:00:00Z`)
  return counts.map((count, i) => ({
    date: new Date(endMs - (counts.length - 1 - i) * 864e5).toISOString().slice(0, 10),
    count,
  }))
}

function pullRequest(overrides: Partial<PullRequest>): PullRequest {
  return {
    number: 1,
    title: 'feat: something',
    url: 'https://github.com/sebascm-dev/repo/pull/1',
    state: 'OPEN',
    isDraft: false,
    repo: 'repo',
    isPrivate: false,
    createdAt: '2026-09-14T10:00:00Z',
    mergedAt: null,
    closedAt: null,
    ...overrides,
  }
}

describe('summarizeActivity', () => {
  const windows = getRangeWindows('7d', NOW)
  const summary = summarizeActivity(
    data({
      commits: [
        commit('alpha', '2026-09-15T08:00:00Z'),
        // 22:30 UTC on the 14th is already the 15th in Madrid
        commit('alpha', '2026-09-14T22:30:00Z'),
        commit('alpha', '2026-09-13T10:00:00Z'),
        commit('beta', '2026-09-13T11:00:00Z', { isPrivate: true }),
        commit('alpha', '2026-09-05T10:00:00Z'), // previous window
        commit('alpha', '2026-08-20T10:00:00Z'), // outside both windows
      ],
    }),
    windows
  )

  it('counts only commits in the current window, by Madrid day', () => {
    expect(summary.total).toBe(4)
    expect(summary.days).toHaveLength(7)
    expect(summary.days.find((d) => d.date === '2026-09-15')?.count).toBe(2)
    expect(summary.days.find((d) => d.date === '2026-09-14')?.count).toBe(0)
    expect(summary.days.find((d) => d.date === '2026-09-13')?.count).toBe(2)
  })

  it('compares against the previous window', () => {
    expect(summary.previousTotal).toBe(1)
    expect(summary.delta).toBe(300)
    expect(summary.lastPreviousCommitAt).toBe('2026-09-05T10:00:00Z')
  })

  it('derives active days, streaks and repositories', () => {
    expect(summary.activeDays).toBe(2)
    expect(summary.windowDays).toBe(7)
    expect(summary.currentStreak).toBe(1)
    expect(summary.bestStreak).toBe(1)
    expect(summary.reposWithCommits).toBe(2)
    expect(summary.totalRepos).toBe(4)
    expect(summary.perRepo).toEqual([
      { repo: 'alpha', isPrivate: false, count: 3 },
      { repo: 'beta', isPrivate: true, count: 1 },
    ])
  })

  it('counts pull requests opened and merged in the current window, by Madrid day', () => {
    const withPullRequests = summarizeActivity(
      data({
        pullRequests: [
          pullRequest({ number: 1, createdAt: '2026-09-14T10:00:00Z' }),
          // 22:30 UTC on the 8th is already the 9th (first day of the window) in Madrid
          pullRequest({ number: 2, createdAt: '2026-09-08T22:30:00Z', state: 'MERGED', mergedAt: '2026-09-10T10:00:00Z' }),
          pullRequest({ number: 3, createdAt: '2026-09-12T10:00:00Z', state: 'CLOSED', closedAt: '2026-09-13T10:00:00Z' }),
          // Opened in the previous window but merged in this one
          pullRequest({ number: 4, createdAt: '2026-09-01T10:00:00Z', state: 'MERGED', mergedAt: '2026-09-11T10:00:00Z' }),
          pullRequest({ number: 5, createdAt: '2026-09-05T10:00:00Z' }),
        ],
      }),
      windows
    )

    expect(withPullRequests.pullRequests).toEqual({ opened: 3, merged: 2, open: 1 })
  })

  it('reports zero pull requests when there are none', () => {
    expect(summary.pullRequests).toEqual({ opened: 0, merged: 0, open: 0 })
  })

  it('orders weekdays from Monday to Sunday', () => {
    expect(summary.weekdays.map((w) => w.label)).toEqual(['L', 'M', 'X', 'J', 'V', 'S', 'D'])
    // 2026-09-15 is a Tuesday and 2026-09-13 a Sunday
    expect(summary.weekdays[1].count).toBe(2)
    expect(summary.weekdays[6].count).toBe(2)
  })
})

describe('currentStreak', () => {
  it('counts consecutive active days ending today', () => {
    expect(currentStreak(days([0, 1, 2, 3]))).toBe(3)
  })

  it('does not break the streak when today has no commits yet', () => {
    expect(currentStreak(days([1, 1, 1, 0]))).toBe(3)
  })

  it('is zero when both today and yesterday are idle', () => {
    expect(currentStreak(days([1, 1, 0, 0]))).toBe(0)
  })

  it('is zero for an empty window', () => {
    expect(currentStreak([])).toBe(0)
  })
})

describe('bestStreak', () => {
  it('finds the longest run of active days', () => {
    expect(bestStreak(days([1, 1, 0, 1, 1, 1, 0, 1]))).toBe(3)
    expect(bestStreak(days([0, 0, 0]))).toBe(0)
  })
})

describe('computeDelta', () => {
  it('returns a rounded percentage change', () => {
    expect(computeDelta(15, 12)).toBe(25)
    expect(computeDelta(6, 10)).toBe(-40)
    expect(computeDelta(5, 5)).toBe(0)
    expect(computeDelta(1, 3)).toBe(-67)
  })

  it('is null when the previous window had no commits', () => {
    expect(computeDelta(10, 0)).toBeNull()
    expect(computeDelta(0, 0)).toBeNull()
  })
})

describe('sparkline', () => {
  it.each([
    [7, 7],
    [30, 10],
    [90, 13],
    [365, 12],
  ])('splits %i days into %i points whose sum is the total', (length, points) => {
    const input = days(Array.from({ length }, (_, i) => (i * 7) % 5))
    const result = sparkline(input)
    expect(result).toHaveLength(points)
    expect(result.reduce((s, n) => s + n, 0)).toBe(input.reduce((s, d) => s + d.count, 0))
  })

  it('keeps the most recent day in the last point', () => {
    const result = sparkline(days([...Array(29).fill(0), 9]))
    expect(result[result.length - 1]).toBe(9)
  })

  it('is empty for an empty window', () => {
    expect(sparkline([])).toEqual([])
  })
})

describe('weekdayCounts', () => {
  it('adds each day to its Monday-first weekday', () => {
    // 2026-09-14 is a Monday
    const result = weekdayCounts([
      { date: '2026-09-14', count: 3 },
      { date: '2026-09-20', count: 2 },
      { date: '2026-09-21', count: 1 },
    ])
    expect(result[0]).toMatchObject({ weekday: 0, label: 'L', name: 'lunes', count: 4 })
    expect(result[6]).toMatchObject({ weekday: 6, label: 'D', name: 'domingo', count: 2 })
  })
})

describe('buildFeed', () => {
  const window = getRangeWindows('30d', NOW).current

  it('merges every event type sorted from newest to oldest', () => {
    const feed = buildFeed(
      data({
        commits: [commit('alpha', '2026-09-10T10:00:00Z')],
        pullRequests: [pullRequest({ number: 2, state: 'MERGED', createdAt: '2026-09-01T10:00:00Z', mergedAt: '2026-09-12T10:00:00Z' })],
        releases: [{ repo: 'alpha', isPrivate: false, name: 'v1', tagName: 'v1.0.0', url: 'u', publishedAt: '2026-09-11T10:00:00Z' }],
        repoCreations: [{ repo: 'gamma', isPrivate: true, url: 'u', createdAt: '2026-09-09T10:00:00Z' }],
      }),
      window
    )
    expect(feed.map((item) => item.kind)).toEqual(['pull-request', 'release', 'commit', 'repo-created'])
    expect(new Set(feed.map((item) => item.id)).size).toBe(feed.length)
  })

  it('dates a pull request by its latest event inside the window', () => {
    const merged = pullRequest({ number: 1, state: 'MERGED', createdAt: '2026-06-01T10:00:00Z', mergedAt: '2026-09-12T10:00:00Z', closedAt: '2026-09-12T10:00:00Z' })
    const closed = pullRequest({ number: 2, state: 'CLOSED', createdAt: '2026-09-02T10:00:00Z', closedAt: '2026-09-03T10:00:00Z' })
    const opened = pullRequest({ number: 3, state: 'OPEN', createdAt: '2026-09-04T10:00:00Z' })
    const old = pullRequest({ number: 4, state: 'CLOSED', createdAt: '2026-05-01T10:00:00Z', closedAt: '2026-05-02T10:00:00Z' })

    const feed = buildFeed(data({ pullRequests: [merged, closed, opened, old] }), window)
    const events = feed.map((item) => (item.kind === 'pull-request' ? `${item.pullRequest.number}:${item.event}:${item.date}` : ''))

    expect(events).toEqual([
      '1:merged:2026-09-12T10:00:00Z',
      '3:opened:2026-09-04T10:00:00Z',
      '2:closed:2026-09-03T10:00:00Z',
    ])
  })

  it('leaves out events outside the window', () => {
    const feed = buildFeed(
      data({
        commits: [commit('alpha', '2026-07-01T10:00:00Z')],
        releases: [{ repo: 'a', isPrivate: false, name: '', tagName: 'v0', url: 'u', publishedAt: '2026-01-01T10:00:00Z' }],
        repoCreations: [{ repo: 'b', isPrivate: false, url: 'u', createdAt: '2025-01-01T10:00:00Z' }],
      }),
      window
    )
    expect(feed).toEqual([])
  })

  it(`keeps at most ${FEED_LIMIT} items`, () => {
    const commits = Array.from({ length: 80 }, (_, i) =>
      commit('alpha', `2026-09-10T10:${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}Z`, { oid: `c${i}` })
    )
    expect(buildFeed(data({ commits }), window)).toHaveLength(FEED_LIMIT)
  })
})

describe('activityLevel', () => {
  it('maps a day to one of four intensity levels relative to the busiest day', () => {
    expect(activityLevel(0, 8)).toBe(0)
    expect(activityLevel(1, 8)).toBe(1)
    expect(activityLevel(2, 8)).toBe(1)
    expect(activityLevel(3, 8)).toBe(2)
    expect(activityLevel(5, 8)).toBe(3)
    expect(activityLevel(7, 8)).toBe(4)
    expect(activityLevel(8, 8)).toBe(4)
    expect(activityLevel(0, 0)).toBe(0)
  })
})

// The core promise of the design: every number on the page agrees.
describe('invariant: all counts agree', () => {
  function seeded(seed: number) {
    let state = seed
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296
      return state / 4294967296
    }
  }

  it.each<RangeKey>(['7d', '30d', '90d', '12m'])('holds for random commits in %s', (range) => {
    const random = seeded(range.length * 97 + 11)
    const repos = ['alpha', 'beta', 'gamma']
    const commits = Array.from({ length: 400 }, (_, i) => {
      const offsetMs = Math.floor(random() * 800 * 864e5)
      const committedAt = new Date(NOW.getTime() - offsetMs).toISOString().replace(/\.\d{3}Z$/, 'Z')
      return commit(repos[i % repos.length], committedAt, { oid: `c${i}` })
    })

    const summary = summarizeActivity(data({ commits }), getRangeWindows(range, NOW))
    const sum = (values: number[]) => values.reduce((s, n) => s + n, 0)

    expect(sum(summary.days.map((d) => d.count))).toBe(summary.total)
    expect(sum(summary.perRepo.map((r) => r.count))).toBe(summary.total)
    expect(sum(summary.weekdays.map((w) => w.count))).toBe(summary.total)
    expect(sum(summary.sparkline)).toBe(summary.total)
    expect(summary.activeDays).toBe(summary.days.filter((d) => d.count > 0).length)
    expect(bucketByDay(commits, getRangeWindows(range, NOW).current)).toEqual(summary.days)
  })
})
