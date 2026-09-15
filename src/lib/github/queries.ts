// Server-only. GitHub GraphQL queries for the admin dashboard.
import { cache } from 'react'
import { getViewer, GITHUB_OWNER, githubGraphql } from './client'
import { getRangeWindows } from './range'
import type {
  ActivityData,
  Commit,
  PullRequest,
  PullRequestState,
  RangeKey,
  RangeWindows,
  ReposData,
} from './types'

const ACTIVITY_REPOS_QUERY = `
  query ActivityRepos($login: String!) {
    user(login: $login) {
      repositories(first: 100, ownerAffiliations: OWNER) {
        nodes {
          name
          url
          isPrivate
          createdAt
          defaultBranchRef { name }
          releases(first: 10, orderBy: { field: CREATED_AT, direction: DESC }) {
            nodes { name tagName url publishedAt }
          }
        }
      }
    }
  }
`

const REPO_HISTORY_QUERY = `
  query RepoHistory($owner: String!, $name: String!, $since: GitTimestamp!, $author: ID!, $after: String) {
    repository(owner: $owner, name: $name) {
      defaultBranchRef {
        target {
          ... on Commit {
            history(first: 100, since: $since, author: { id: $author }, after: $after) {
              pageInfo { hasNextPage endCursor }
              nodes { oid committedDate messageHeadline url additions deletions }
            }
          }
        }
      }
    }
  }
`

const PULL_REQUESTS_QUERY = `
  query PullRequests($q: String!) {
    search(query: $q, type: ISSUE, first: 50) {
      nodes {
        ... on PullRequest {
          number
          title
          url
          state
          isDraft
          createdAt
          mergedAt
          closedAt
          repository { name isPrivate }
        }
      }
    }
  }
`

const REPOS_OVERVIEW_QUERY = `
  query ReposOverview($login: String!) {
    user(login: $login) {
      repositories(first: 100, ownerAffiliations: OWNER, orderBy: { field: PUSHED_AT, direction: DESC }) {
        nodes {
          name
          description
          url
          isPrivate
          pushedAt
          stargazerCount
          forkCount
          primaryLanguage { name }
          issues(states: OPEN) { totalCount }
          languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
            edges { size node { name } }
          }
          defaultBranchRef { target { ... on Commit { history { totalCount } } } }
        }
      }
    }
  }
`

interface ActivityRepoNode {
  name: string
  url: string
  isPrivate: boolean
  createdAt: string
  defaultBranchRef: { name: string } | null
  releases: { nodes: { name: string | null; tagName: string; url: string; publishedAt: string | null }[] }
}

interface HistoryNode {
  oid: string
  committedDate: string
  messageHeadline: string
  url: string
  additions: number
  deletions: number
}

interface RepoHistoryResponse {
  repository: {
    defaultBranchRef: {
      target: {
        history?: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: HistoryNode[] }
      } | null
    } | null
  } | null
}

interface PullRequestNode {
  number?: number
  title: string
  url: string
  state: PullRequestState
  isDraft: boolean
  createdAt: string
  mergedAt: string | null
  closedAt: string | null
  repository: { name: string; isPrivate: boolean }
}

interface RepoOverviewNode {
  name: string
  description: string | null
  url: string
  isPrivate: boolean
  pushedAt: string | null
  stargazerCount: number
  forkCount: number
  primaryLanguage: { name: string } | null
  issues: { totalCount: number }
  languages: { edges: { size: number; node: { name: string } }[] }
  defaultBranchRef: { target: { history?: { totalCount: number } } | null } | null
}

const oldest = (dates: string[]) => dates.reduce((min, date) => (date < min ? date : min))

/** Walks every page of a repository's default-branch history */
async function fetchRepoHistory(
  repo: ActivityRepoNode,
  since: string,
  authorId: string
): Promise<{ commits: Commit[]; fetchedAt: string[] }> {
  const commits: Commit[] = []
  const fetchedAt: string[] = []
  const branch = repo.defaultBranchRef?.name ?? ''
  let after: string | null = null

  do {
    const result: { data: RepoHistoryResponse; fetchedAt: string } = await githubGraphql<RepoHistoryResponse>(
      REPO_HISTORY_QUERY,
      { owner: GITHUB_OWNER, name: repo.name, since, author: authorId, after }
    )
    fetchedAt.push(result.fetchedAt)

    const history = result.data.repository?.defaultBranchRef?.target?.history
    if (!history) break

    for (const node of history.nodes) {
      commits.push({
        oid: node.oid,
        repo: repo.name,
        isPrivate: repo.isPrivate,
        branch,
        committedAt: node.committedDate,
        message: node.messageHeadline,
        url: node.url,
        additions: node.additions,
        deletions: node.deletions,
      })
    }
    after = history.pageInfo.hasNextPage ? history.pageInfo.endCursor : null
  } while (after)

  return { commits, fetchedAt }
}

/** Everything the activity section needs for a range; fails as a whole if any request fails */
export async function fetchActivityData(windows: RangeWindows): Promise<ActivityData> {
  const [viewer, reposResult] = await Promise.all([
    getViewer(),
    githubGraphql<{ user: { repositories: { nodes: ActivityRepoNode[] } } }>(ACTIVITY_REPOS_QUERY, {
      login: GITHUB_OWNER,
    }),
  ])
  const repos = reposResult.data.user.repositories.nodes

  const [histories, pullRequestsResult] = await Promise.all([
    Promise.all(
      repos
        .filter((repo) => repo.defaultBranchRef)
        .map((repo) => fetchRepoHistory(repo, windows.since, viewer.id))
    ),
    githubGraphql<{ search: { nodes: PullRequestNode[] } }>(PULL_REQUESTS_QUERY, {
      q: `author:${viewer.login} is:pr updated:>=${windows.previous.start}`,
    }),
  ])

  const pullRequests: PullRequest[] = pullRequestsResult.data.search.nodes
    .filter((node): node is PullRequestNode & { number: number } => typeof node.number === 'number')
    .map((node) => ({
      number: node.number,
      title: node.title,
      url: node.url,
      state: node.state,
      isDraft: node.isDraft,
      repo: node.repository.name,
      isPrivate: node.repository.isPrivate,
      createdAt: node.createdAt,
      mergedAt: node.mergedAt,
      closedAt: node.closedAt,
    }))

  return {
    commits: histories.flatMap((history) => history.commits),
    pullRequests,
    releases: repos.flatMap((repo) =>
      repo.releases.nodes
        .filter((release): release is typeof release & { publishedAt: string } => Boolean(release.publishedAt))
        .map((release) => ({
          repo: repo.name,
          isPrivate: repo.isPrivate,
          name: release.name ?? '',
          tagName: release.tagName,
          url: release.url,
          publishedAt: release.publishedAt,
        }))
    ),
    repoCreations: repos.map((repo) => ({
      repo: repo.name,
      isPrivate: repo.isPrivate,
      url: repo.url,
      createdAt: repo.createdAt,
    })),
    totalRepos: repos.length,
    fetchedAt: oldest([
      reposResult.fetchedAt,
      pullRequestsResult.fetchedAt,
      ...histories.flatMap((history) => history.fetchedAt),
    ]),
  }
}

/** Range-independent repository metadata and language sizes */
export async function fetchReposData(): Promise<ReposData> {
  const { data, fetchedAt } = await githubGraphql<{ user: { repositories: { nodes: RepoOverviewNode[] } } }>(
    REPOS_OVERVIEW_QUERY,
    { login: GITHUB_OWNER }
  )
  const nodes = data.user.repositories.nodes

  const bytesByLanguage = new Map<string, number>()
  for (const node of nodes) {
    for (const edge of node.languages.edges) {
      bytesByLanguage.set(edge.node.name, (bytesByLanguage.get(edge.node.name) ?? 0) + edge.size)
    }
  }
  const totalBytes = [...bytesByLanguage.values()].reduce((sum, bytes) => sum + bytes, 0)

  return {
    repos: nodes.map((node) => ({
      name: node.name,
      description: node.description,
      url: node.url,
      isPrivate: node.isPrivate,
      primaryLanguage: node.primaryLanguage?.name ?? null,
      stars: node.stargazerCount,
      forks: node.forkCount,
      openIssues: node.issues.totalCount,
      pushedAt: node.pushedAt,
      totalCommits: node.defaultBranchRef?.target?.history?.totalCount ?? 0,
    })),
    languages:
      totalBytes === 0
        ? []
        : [...bytesByLanguage.entries()]
            .map(([name, bytes]) => ({ name, bytes, share: bytes / totalBytes }))
            .sort((a, b) => b.bytes - a.bytes),
    fetchedAt,
  }
}

/** Deduplicated per request: the filter row and the sections share one fetch */
export const getActivityData = cache(async (range: RangeKey) => {
  const windows = getRangeWindows(range)
  return { data: await fetchActivityData(windows), windows }
})

export const getReposData = cache(fetchReposData)
