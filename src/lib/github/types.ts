// Shared GitHub dashboard types. Type-only module: safe to import from client components.

export type RangeKey = '7d' | '30d' | '90d' | '12m'

/** Inclusive calendar-day window in Europe/Madrid, as YYYY-MM-DD strings */
export interface DateWindow {
  start: string
  end: string
}

export interface RangeWindows {
  key: RangeKey
  days: number
  current: DateWindow
  previous: DateWindow
  /** ISO instant used as the GraphQL `since` filter (covers both windows) */
  since: string
}

export interface Commit {
  oid: string
  repo: string
  isPrivate: boolean
  branch: string
  committedAt: string
  message: string
  url: string
  additions: number
  deletions: number
}

export type PullRequestState = 'OPEN' | 'CLOSED' | 'MERGED'

export interface PullRequest {
  number: number
  title: string
  url: string
  state: PullRequestState
  isDraft: boolean
  repo: string
  isPrivate: boolean
  createdAt: string
  mergedAt: string | null
  closedAt: string | null
}

export interface Release {
  repo: string
  isPrivate: boolean
  name: string
  tagName: string
  url: string
  publishedAt: string
}

export interface RepoCreation {
  repo: string
  isPrivate: boolean
  url: string
  createdAt: string
}

export interface ActivityData {
  commits: Commit[]
  pullRequests: PullRequest[]
  releases: Release[]
  repoCreations: RepoCreation[]
  totalRepos: number
  /** When GitHub produced the (possibly cached) data */
  fetchedAt: string
}

export type PullRequestEvent = 'opened' | 'merged' | 'closed'

export type FeedItem =
  | { kind: 'commit'; id: string; date: string; commit: Commit }
  | { kind: 'pull-request'; id: string; date: string; event: PullRequestEvent; pullRequest: PullRequest }
  | { kind: 'release'; id: string; date: string; release: Release }
  | { kind: 'repo-created'; id: string; date: string; repo: RepoCreation }

export interface DayCount {
  date: string
  count: number
}

export interface RepoCount {
  repo: string
  isPrivate: boolean
  count: number
}

export interface WeekdayCount {
  /** 0 = Monday … 6 = Sunday */
  weekday: number
  label: string
  name: string
  count: number
}

export interface ActivitySummary {
  total: number
  previousTotal: number
  /** Percentage change vs the previous window; null when the previous window had no commits */
  delta: number | null
  days: DayCount[]
  sparkline: number[]
  currentStreak: number
  bestStreak: number
  activeDays: number
  windowDays: number
  reposWithCommits: number
  totalRepos: number
  perRepo: RepoCount[]
  weekdays: WeekdayCount[]
  feed: FeedItem[]
  /** Latest commit in the previous window, used by the empty state */
  lastPreviousCommitAt: string | null
}

export interface LanguageShare {
  name: string
  bytes: number
  /** 0…1 */
  share: number
}

export interface RepoSummary {
  name: string
  description: string | null
  url: string
  isPrivate: boolean
  primaryLanguage: string | null
  stars: number
  forks: number
  openIssues: number
  pushedAt: string | null
  totalCommits: number
}

export interface ReposData {
  repos: RepoSummary[]
  languages: LanguageShare[]
  fetchedAt: string
}
