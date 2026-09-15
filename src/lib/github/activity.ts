// Pure derivations for the GitHub dashboard.
// Every number on the page comes from the same commit list, so they always agree:
// sum(days) === total === sum(perRepo) === sum(weekdays) === sum(sparkline).
import { addDays, madridDate } from './range'
import type {
  ActivityData,
  ActivitySummary,
  Commit,
  DateWindow,
  DayCount,
  FeedItem,
  PullRequest,
  PullRequestCounts,
  PullRequestEvent,
  RangeWindows,
  RepoCount,
  WeekdayCount,
} from './types'

export const FEED_LIMIT = 50

const WEEKDAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const
const WEEKDAY_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'] as const

/** Sparkline resolution per window length (days -> points) */
const SPARKLINE_POINTS: Record<number, number> = { 7: 7, 30: 10, 90: 13, 365: 12 }

const dayOf = (iso: string) => madridDate(new Date(iso))
const isInWindow = (day: string, window: DateWindow) => day >= window.start && day <= window.end
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

/** 0 = Monday … 6 = Sunday */
export function weekdayIndex(date: string): number {
  return (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7
}

/** One entry per day of the window (Madrid days), zero-filled */
export function bucketByDay(commits: Commit[], window: DateWindow): DayCount[] {
  const counts = new Map<string, number>()
  for (const commit of commits) {
    const day = dayOf(commit.committedAt)
    if (isInWindow(day, window)) counts.set(day, (counts.get(day) ?? 0) + 1)
  }

  const days: DayCount[] = []
  for (let date = window.start; date <= window.end; date = addDays(date, 1)) {
    days.push({ date, count: counts.get(date) ?? 0 })
  }
  return days
}

/** Consecutive active days ending today; an idle today does not break the streak (GitHub rule) */
export function currentStreak(days: DayCount[]): number {
  let index = days.length - 1
  if (index >= 0 && days[index].count === 0) index--

  let streak = 0
  for (; index >= 0 && days[index].count > 0; index--) streak++
  return streak
}

export function bestStreak(days: DayCount[]): number {
  let best = 0
  let run = 0
  for (const day of days) {
    run = day.count > 0 ? run + 1 : 0
    best = Math.max(best, run)
  }
  return best
}

/** Rounded percentage change; null when there is nothing to compare against */
export function computeDelta(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

/** Buckets aligned to end today; the oldest bucket may be shorter */
export function sparkline(days: DayCount[]): number[] {
  if (days.length === 0) return []

  const points = SPARKLINE_POINTS[days.length] ?? Math.min(12, days.length)
  const bucketLength = Math.ceil(days.length / points)
  const result: number[] = []

  for (let end = days.length; end > 0 && result.length < points; end -= bucketLength) {
    const bucket = days.slice(Math.max(0, end - bucketLength), end)
    result.unshift(sum(bucket.map((day) => day.count)))
  }
  return result
}

export function weekdayCounts(days: DayCount[]): WeekdayCount[] {
  const result = WEEKDAY_LABELS.map((label, weekday) => ({
    weekday,
    label,
    name: WEEKDAY_NAMES[weekday],
    count: 0,
  }))
  for (const day of days) result[weekdayIndex(day.date)].count += day.count
  return result
}

export function countPerRepo(commits: Commit[], window: DateWindow): RepoCount[] {
  const byRepo = new Map<string, RepoCount>()
  for (const commit of commits) {
    if (!isInWindow(dayOf(commit.committedAt), window)) continue
    const entry = byRepo.get(commit.repo) ?? { repo: commit.repo, isPrivate: commit.isPrivate, count: 0 }
    entry.count++
    byRepo.set(commit.repo, entry)
  }
  return [...byRepo.values()].sort((a, b) => b.count - a.count || a.repo.localeCompare(b.repo))
}

/** Latest event of a pull request that falls inside the window: merged > closed > opened */
function pullRequestEvent(
  pullRequest: PullRequest,
  window: DateWindow
): { event: PullRequestEvent; date: string } | null {
  if (pullRequest.mergedAt && isInWindow(dayOf(pullRequest.mergedAt), window)) {
    return { event: 'merged', date: pullRequest.mergedAt }
  }
  if (!pullRequest.mergedAt && pullRequest.closedAt && isInWindow(dayOf(pullRequest.closedAt), window)) {
    return { event: 'closed', date: pullRequest.closedAt }
  }
  if (isInWindow(dayOf(pullRequest.createdAt), window)) {
    return { event: 'opened', date: pullRequest.createdAt }
  }
  return null
}

/** Commits, pull requests, releases and new repositories in the window, newest first */
export function buildFeed(data: ActivityData, window: DateWindow): FeedItem[] {
  const items: FeedItem[] = []

  for (const commit of data.commits) {
    if (isInWindow(dayOf(commit.committedAt), window)) {
      items.push({ kind: 'commit', id: `commit:${commit.repo}:${commit.oid}`, date: commit.committedAt, commit })
    }
  }

  for (const pullRequest of data.pullRequests) {
    const latest = pullRequestEvent(pullRequest, window)
    if (latest) {
      items.push({
        kind: 'pull-request',
        id: `pr:${pullRequest.repo}:${pullRequest.number}`,
        date: latest.date,
        event: latest.event,
        pullRequest,
      })
    }
  }

  for (const release of data.releases) {
    if (isInWindow(dayOf(release.publishedAt), window)) {
      items.push({ kind: 'release', id: `release:${release.repo}:${release.tagName}`, date: release.publishedAt, release })
    }
  }

  for (const repo of data.repoCreations) {
    if (isInWindow(dayOf(repo.createdAt), window)) {
      items.push({ kind: 'repo-created', id: `repo:${repo.repo}`, date: repo.createdAt, repo })
    }
  }

  return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, FEED_LIMIT)
}

/** Calendar intensity relative to the busiest day of the window */
export function activityLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || max <= 0) return 0
  const ratio = count / max
  if (ratio > 0.75) return 4
  if (ratio > 0.5) return 3
  if (ratio > 0.25) return 2
  return 1
}

/** Pull requests opened and merged inside the window (Madrid days) */
export function countPullRequests(pullRequests: PullRequest[], window: DateWindow): PullRequestCounts {
  const opened = pullRequests.filter((pr) => isInWindow(dayOf(pr.createdAt), window))

  return {
    opened: opened.length,
    merged: pullRequests.filter((pr) => pr.mergedAt !== null && isInWindow(dayOf(pr.mergedAt), window)).length,
    open: opened.filter((pr) => pr.state === 'OPEN').length,
  }
}

export function summarizeActivity(data: ActivityData, windows: RangeWindows): ActivitySummary {
  const days = bucketByDay(data.commits, windows.current)
  const total = sum(days.map((day) => day.count))

  const previousCommits = data.commits.filter((commit) =>
    isInWindow(dayOf(commit.committedAt), windows.previous)
  )
  const perRepo = countPerRepo(data.commits, windows.current)

  return {
    total,
    previousTotal: previousCommits.length,
    delta: computeDelta(total, previousCommits.length),
    days,
    sparkline: sparkline(days),
    currentStreak: currentStreak(days),
    bestStreak: bestStreak(days),
    activeDays: days.filter((day) => day.count > 0).length,
    windowDays: windows.days,
    reposWithCommits: perRepo.length,
    totalRepos: data.totalRepos,
    perRepo,
    weekdays: weekdayCounts(days),
    feed: buildFeed(data, windows.current),
    pullRequests: countPullRequests(data.pullRequests, windows.current),
    lastPreviousCommitAt: previousCommits.reduce<string | null>(
      (latest, commit) => (!latest || commit.committedAt > latest ? commit.committedAt : latest),
      null
    ),
  }
}
