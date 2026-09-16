// Pure derivations for the public hero activity graph. Safe on the server and the client.
// Built from real commits (the same list the admin dashboard uses): one point per day, with
// the real commits of the 30 days that end on it and a smoothed value that the curve draws.
import { addDays, madridDate } from './range'
import type { Commit, DateWindow, RepoCreation } from './types'

/** Days drawn in the hero (52 weeks) */
export const HERO_DAYS = 364

/** Length of the rolling range behind every point: reads like "commits per month" without monthly jumps */
export const ROLLING_DAYS = 30

/** Gaussian smoothing of the drawn curve: spread (days) and how far the kernel reaches */
const SMOOTHING_SIGMA_DAYS = 6
// 4 sigmas: past this the weights are negligible, so the curve reaches zero without a visible cut
const SMOOTHING_RADIUS_DAYS = 24

/** Days lit around each commit when a repo is highlighted, so a single day is still visible */
const HIGHLIGHT_RADIUS_DAYS = 2

/** Small headroom above the highest point: the chart area itself already starts below the hero text */
const HEADROOM = 1.1

/**
 * Offset for the square-root scale. A plain sqrt is vertical at 0, so almost-zero activity
 * jumps off the baseline; sqrt(x + c) - sqrt(c) keeps 0 at 0 but starts with a gentle slope.
 */
const SCALE_OFFSET = 0.25

const scaleLevel = (value: number) => Math.sqrt(value + SCALE_OFFSET) - Math.sqrt(SCALE_OFFSET)

/** Minimum top of the Y axis: a quiet year should not fill the whole hero */
const MIN_DOMAIN_LEVEL = scaleLevel(10)

export interface HeroRepo {
  name: string
  commits: number
  isPrivate: boolean
}

export interface HeroPoint {
  /** First day of the rolling range (YYYY-MM-DD, Madrid) */
  start: string
  /** Day this point belongs to: last day of the rolling range, inclusive */
  end: string
  /** Every commit of the range, private repos included */
  commits: number
  /** Smoothed activity around `end`, in commits per ROLLING_DAYS: what the curve draws */
  smoothed: number
  /** Repos worked on during the range (public and private), most commits first */
  repos: HeroRepo[]
  /** Repos created exactly on `end` (public and private) */
  newRepos: string[]
  /** Commits per repo made exactly on `end` */
  dayCommits: Record<string, number>
}

export interface ScaledHeroPoint extends HeroPoint {
  /** Compressed height used only for drawing */
  level: number
}

const dayOf = (iso: string) => madridDate(new Date(iso))

/** The last HERO_DAYS days, ending today (Madrid) */
export function heroWindow(now: Date = new Date()): DateWindow {
  const end = madridDate(now)
  return { start: addDays(end, -(HERO_DAYS - 1)), end }
}

/**
 * Commits needed to draw `window`: the first day also needs the ROLLING_DAYS - 1 days before it
 * (which also covers the SMOOTHING_RADIUS_DAYS the curve looks back, as long as it stays below 30)
 */
export function heroHistoryWindow(window: DateWindow): DateWindow {
  return { start: addDays(window.start, -(ROLLING_DAYS - 1)), end: window.end }
}

/**
 * One point per day of `window`. Each point sums the commits of the ROLLING_DAYS days
 * ending on it, carries a smoothed value for the curve and marks the repos created on
 * that exact day.
 */
export function buildDailyPoints(
  commits: Commit[],
  repoCreations: RepoCreation[],
  window: DateWindow
): HeroPoint[] {
  // Commits and repo creations grouped by Madrid day
  const commitsByDay = new Map<string, Commit[]>()
  for (const commit of commits) {
    const day = dayOf(commit.committedAt)
    commitsByDay.set(day, [...(commitsByDay.get(day) ?? []), commit])
  }

  const createdOn = new Map<string, string[]>()
  for (const repo of repoCreations) {
    const day = dayOf(repo.createdAt)
    createdOn.set(day, [...(createdOn.get(day) ?? []), repo.repo])
  }

  const history = heroHistoryWindow(window)
  const kernel = Array.from({ length: SMOOTHING_RADIUS_DAYS * 2 + 1 }, (_, i) => {
    const offset = i - SMOOTHING_RADIUS_DAYS
    return Math.exp(-(offset * offset) / (2 * SMOOTHING_SIGMA_DAYS * SMOOTHING_SIGMA_DAYS))
  })

  /**
   * Gaussian-weighted daily rate around `day`, scaled to ROLLING_DAYS. Days outside the known
   * history (the future, mainly) are skipped and the weights renormalised, so the last days
   * are not dragged towards zero.
   */
  const smoothedAround = (day: string) => {
    let weighted = 0
    let weights = 0
    kernel.forEach((weight, i) => {
      const other = addDays(day, i - SMOOTHING_RADIUS_DAYS)
      if (other < history.start || other > history.end) return
      weighted += weight * (commitsByDay.get(other)?.length ?? 0)
      weights += weight
    })
    return weights > 0 ? (weighted / weights) * ROLLING_DAYS : 0
  }

  const points: HeroPoint[] = []
  for (let end = window.start; end <= window.end; end = addDays(end, 1)) {
    const start = addDays(end, -(ROLLING_DAYS - 1))
    const repoCounts = new Map<string, HeroRepo>()
    let total = 0

    for (let day = start; day <= end; day = addDays(day, 1)) {
      for (const commit of commitsByDay.get(day) ?? []) {
        const repo = repoCounts.get(commit.repo) ?? { name: commit.repo, commits: 0, isPrivate: commit.isPrivate }
        repo.commits++
        repoCounts.set(commit.repo, repo)
        total++
      }
    }

    points.push({
      start,
      end,
      commits: total,
      smoothed: smoothedAround(end),
      repos: [...repoCounts.values()].sort((a, b) => b.commits - a.commits || a.name.localeCompare(b.name)),
      newRepos: createdOn.get(end) ?? [],
      dayCommits: Object.fromEntries(
        [...new Set((commitsByDay.get(end) ?? []).map((commit) => commit.repo))].map((repo) => [
          repo,
          (commitsByDay.get(end) ?? []).filter((commit) => commit.repo === repo).length,
        ])
      ),
    })
  }
  return points
}

export interface RepoActivity {
  /** Commits of the repos across all points */
  total: number
  /** Days with at least one commit in the repos */
  activeDays: number
  /** Days (`end`) to light up: every commit day plus HIGHLIGHT_RADIUS_DAYS around it */
  highlighted: Set<string>
  /** Commits per consecutive 7-day block starting at the first point (last block may be shorter) */
  weekly: number[]
}

/** Where and how much the given repos were worked on, for the hover highlight */
export function repoActivity(points: HeroPoint[], repos: string[]): RepoActivity {
  let total = 0
  let activeDays = 0
  const highlighted = new Set<string>()
  const weekly = Array.from({ length: Math.ceil(points.length / 7) }, () => 0)

  points.forEach((point, index) => {
    const commits = repos.reduce((sum, repo) => sum + (point.dayCommits[repo] ?? 0), 0)
    if (commits === 0) return
    total += commits
    activeDays++
    weekly[Math.floor(index / 7)] += commits
    const from = Math.max(0, index - HIGHLIGHT_RADIUS_DAYS)
    const to = Math.min(points.length - 1, index + HIGHLIGHT_RADIUS_DAYS)
    for (let i = from; i <= to; i++) highlighted.add(points[i].end)
  })

  return { total, activeDays, highlighted, weekly }
}

/**
 * Adds a drawing height to each point from its smoothed activity. An offset square root
 * compresses big months (100 vs 5 commits: ~5.3x instead of 20x) while keeping visible relief,
 * keeps 0 at 0 and rises gently from it. Raw commit counts stay untouched.
 */
export function scaleActivity(points: HeroPoint[]): ScaledHeroPoint[] {
  return points.map((point) => ({ ...point, level: scaleLevel(point.smoothed) }))
}

/** Fixed top of the Y axis: highest level plus headroom, with a floor for quiet years */
export function yDomainMax(levels: number[]): number {
  return Math.max(MIN_DOMAIN_LEVEL, ...levels) * HEADROOM
}
