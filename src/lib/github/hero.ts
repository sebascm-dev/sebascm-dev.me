// Pure derivations for the public hero activity graph. Safe on the server and the client.
// Built from real commits (the same list the admin dashboard uses), bucketed by week.
import { bucketByDay } from './activity'
import { addDays, madridDate } from './range'
import type { Commit, DateWindow, RepoCreation } from './types'

/** Number of full weeks shown in the hero (52 weeks = 364 days) */
export const HERO_WEEKS = 52

/** Headroom above the highest point, so the peak stays below the hero text */
const HEADROOM = 1.6

/** Minimum top of the Y axis: a quiet year should not fill the whole hero */
const MIN_DOMAIN_LEVEL = Math.log1p(10)

/** Smoothing kernel applied to neighbouring weeks: previous, current, next */
const SMOOTHING_KERNEL = [0.25, 0.5, 0.25] as const

export interface HeroRepo {
  name: string
  commits: number
}

export interface HeroPoint {
  /** First day of the week (YYYY-MM-DD, Madrid) */
  start: string
  /** Last day of the week, inclusive */
  end: string
  /** Every commit of the week, private repos included */
  commits: number
  /** Commits made in private repos; their names are never exposed */
  privateCommits: number
  /** Public repos worked on during the week, most commits first */
  repos: HeroRepo[]
  /** Public repos created during the week */
  newRepos: string[]
}

export interface ScaledHeroPoint extends HeroPoint {
  /** Compressed, smoothed height used only for drawing */
  level: number
}

/** The last HERO_WEEKS full weeks, ending today (Madrid) */
export function heroWindow(now: Date = new Date()): DateWindow {
  const end = madridDate(now)
  return { start: addDays(end, -(HERO_WEEKS * 7 - 1)), end }
}

/**
 * Groups commits into consecutive 7-day buckets starting at `window.start`.
 * Only complete weeks are returned, so the last point is never a noisy partial bucket.
 */
export function buildWeeklyPoints(
  commits: Commit[],
  repoCreations: RepoCreation[],
  window: DateWindow
): HeroPoint[] {
  const days = bucketByDay(commits, window)
  const weekCount = Math.floor(days.length / 7)

  const points: HeroPoint[] = []
  for (let week = 0; week < weekCount; week++) {
    const start = days[week * 7].date
    const end = days[week * 7 + 6].date
    const inWeek = (iso: string) => {
      const day = madridDate(new Date(iso))
      return day >= start && day <= end
    }

    const weekCommits = commits.filter((commit) => inWeek(commit.committedAt))
    const publicCounts = new Map<string, number>()
    for (const commit of weekCommits) {
      if (!commit.isPrivate) publicCounts.set(commit.repo, (publicCounts.get(commit.repo) ?? 0) + 1)
    }

    points.push({
      start,
      end,
      commits: weekCommits.length,
      privateCommits: weekCommits.filter((commit) => commit.isPrivate).length,
      repos: [...publicCounts.entries()]
        .map(([name, count]) => ({ name, commits: count }))
        .sort((a, b) => b.commits - a.commits || a.name.localeCompare(b.name)),
      newRepos: repoCreations
        .filter((repo) => !repo.isPrivate && inWeek(repo.createdAt))
        .map((repo) => repo.repo),
    })
  }
  return points
}

/**
 * Adds a drawing height to each point.
 * log1p compresses big weeks (100 vs 5 commits: ~2.6x instead of 20x) and keeps 0 at 0;
 * a light kernel then smooths neighbouring weeks. Raw commit counts stay untouched.
 */
export function scaleActivity(
  points: HeroPoint[],
  { smooth = true }: { smooth?: boolean } = {}
): ScaledHeroPoint[] {
  const logs = points.map((point) => Math.log1p(point.commits))

  return points.map((point, index) => {
    if (!smooth) return { ...point, level: logs[index] }
    // Edges reuse their own value instead of a missing neighbour
    const prev = logs[index - 1] ?? logs[index]
    const next = logs[index + 1] ?? logs[index]
    const [wPrev, wCurrent, wNext] = SMOOTHING_KERNEL
    return { ...point, level: wPrev * prev + wCurrent * logs[index] + wNext * next }
  })
}

/** Fixed top of the Y axis: highest level plus headroom, with a floor for quiet years */
export function yDomainMax(levels: number[]): number {
  return Math.max(MIN_DOMAIN_LEVEL, ...levels) * HEADROOM
}
