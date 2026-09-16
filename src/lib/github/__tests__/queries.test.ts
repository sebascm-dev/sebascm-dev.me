import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGraphql = vi.hoisted(() => vi.fn())
const mockGetViewer = vi.hoisted(() => vi.fn())

vi.mock('../client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../client')>()
  return { ...actual, githubGraphql: mockGraphql, getViewer: mockGetViewer }
})

import { fetchActivityData, fetchHeroCommits, fetchReposData } from '../queries'
import { getRangeWindows } from '../range'

const windows = getRangeWindows('30d', new Date('2026-09-15T10:00:00Z'))

function historyNode(oid: string, committedDate: string) {
  return {
    oid,
    committedDate,
    messageHeadline: `commit ${oid}`,
    url: `https://github.com/commit/${oid}`,
    additions: 3,
    deletions: 1,
  }
}

type Variables = Record<string, unknown>

function activityResponses(query: string, variables: Variables) {
  if (query.includes('query ActivityRepos')) {
    return {
      fetchedAt: '2026-09-15T09:50:00.000Z',
      data: {
        user: {
          repositories: {
            nodes: [
              {
                name: 'alpha',
                url: 'https://github.com/sebascm-dev/alpha',
                isPrivate: false,
                createdAt: '2026-09-01T10:00:00Z',
                defaultBranchRef: { name: 'main' },
                releases: {
                  nodes: [
                    { name: 'First', tagName: 'v1.0.0', url: 'https://github.com/r/v1', publishedAt: '2026-09-10T10:00:00Z' },
                    { name: 'Draft', tagName: 'v2.0.0', url: 'https://github.com/r/v2', publishedAt: null },
                  ],
                },
              },
              {
                name: 'beta',
                url: 'https://github.com/sebascm-dev/beta',
                isPrivate: true,
                createdAt: '2025-01-01T10:00:00Z',
                defaultBranchRef: { name: 'master' },
                releases: { nodes: [] },
              },
              {
                name: 'empty',
                url: 'https://github.com/sebascm-dev/empty',
                isPrivate: false,
                createdAt: '2025-02-01T10:00:00Z',
                defaultBranchRef: null,
                releases: { nodes: [] },
              },
            ],
          },
        },
      },
    }
  }

  if (query.includes('query RepoHistory')) {
    const pages: Record<string, unknown> = {
      'alpha:null': { hasNextPage: true, endCursor: 'c1', nodes: [historyNode('a1', '2026-09-14T10:00:00Z')] },
      'alpha:c1': { hasNextPage: false, endCursor: null, nodes: [historyNode('a2', '2026-09-01T10:00:00Z')] },
      'beta:null': { hasNextPage: false, endCursor: null, nodes: [historyNode('b1', '2026-09-12T10:00:00Z')] },
    }
    const page = pages[`${variables.name}:${variables.after}`] as {
      hasNextPage: boolean
      endCursor: string | null
      nodes: unknown[]
    }
    return {
      fetchedAt: '2026-09-15T09:55:00.000Z',
      data: {
        repository: {
          defaultBranchRef: {
            target: {
              history: {
                pageInfo: { hasNextPage: page.hasNextPage, endCursor: page.endCursor },
                nodes: page.nodes,
              },
            },
          },
        },
      },
    }
  }

  if (query.includes('query PullRequests')) {
    return {
      fetchedAt: '2026-09-15T09:52:00.000Z',
      data: {
        search: {
          nodes: [
            {
              number: 2,
              title: 'feat(auth): replace NextAuth',
              url: 'https://github.com/sebascm-dev/alpha/pull/2',
              state: 'MERGED',
              isDraft: false,
              createdAt: '2026-09-14T20:00:00Z',
              mergedAt: '2026-09-14T23:34:00Z',
              closedAt: '2026-09-14T23:34:00Z',
              repository: { name: 'alpha', isPrivate: false },
            },
            {},
          ],
        },
      },
    }
  }

  throw new Error(`Unexpected query: ${query.slice(0, 40)}`)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetViewer.mockResolvedValue({ id: 'VIEWER_ID', login: 'sebascm-dev' })
  mockGraphql.mockImplementation(async (query: string, variables: Variables = {}) =>
    activityResponses(query, variables)
  )
})

describe('fetchActivityData', () => {
  it('paginates the history of every repository with a default branch, filtered by author', async () => {
    const result = await fetchActivityData(windows)

    const historyVariables = mockGraphql.mock.calls
      .filter(([query]) => String(query).includes('query RepoHistory'))
      .map(([, variables]) => variables)

    // Repositories paginate in parallel, so the call order is not guaranteed
    expect(historyVariables).toHaveLength(3)
    expect(historyVariables).toEqual(
      expect.arrayContaining([
        { owner: 'sebascm-dev', name: 'alpha', since: windows.since, author: 'VIEWER_ID', after: null },
        { owner: 'sebascm-dev', name: 'alpha', since: windows.since, author: 'VIEWER_ID', after: 'c1' },
        { owner: 'sebascm-dev', name: 'beta', since: windows.since, author: 'VIEWER_ID', after: null },
      ])
    )
    // The repository without a default branch is never queried
    expect(historyVariables.some((variables) => (variables as Variables).name === 'empty')).toBe(false)

    expect(result.commits.map((c) => c.oid).sort()).toEqual(['a1', 'a2', 'b1'])
    expect(result.commits.find((c) => c.oid === 'b1')).toEqual({
      oid: 'b1',
      repo: 'beta',
      isPrivate: true,
      branch: 'master',
      committedAt: '2026-09-12T10:00:00Z',
      message: 'commit b1',
      url: 'https://github.com/commit/b1',
      additions: 3,
      deletions: 1,
    })
  })

  it('searches pull requests updated since the previous window and ignores non-PR nodes', async () => {
    const result = await fetchActivityData(windows)

    const prCall = mockGraphql.mock.calls.find(([query]) => String(query).includes('query PullRequests'))
    expect(prCall?.[1]).toEqual({ q: 'author:sebascm-dev is:pr updated:>=2026-07-18' })
    expect(result.pullRequests).toEqual([
      {
        number: 2,
        title: 'feat(auth): replace NextAuth',
        url: 'https://github.com/sebascm-dev/alpha/pull/2',
        state: 'MERGED',
        isDraft: false,
        repo: 'alpha',
        isPrivate: false,
        createdAt: '2026-09-14T20:00:00Z',
        mergedAt: '2026-09-14T23:34:00Z',
        closedAt: '2026-09-14T23:34:00Z',
      },
    ])
  })

  it('collects published releases, repository creations and totals', async () => {
    const result = await fetchActivityData(windows)

    expect(result.releases).toEqual([
      { repo: 'alpha', isPrivate: false, name: 'First', tagName: 'v1.0.0', url: 'https://github.com/r/v1', publishedAt: '2026-09-10T10:00:00Z' },
    ])
    expect(result.repoCreations.map((r) => r.repo)).toEqual(['alpha', 'beta', 'empty'])
    expect(result.totalRepos).toBe(3)
  })

  it('reports the oldest response time as fetchedAt', async () => {
    const result = await fetchActivityData(windows)
    expect(result.fetchedAt).toBe('2026-09-15T09:50:00.000Z')
  })

  it('fails as a whole when any history page fails', async () => {
    mockGraphql.mockImplementation(async (query: string, variables: Variables = {}) => {
      if (query.includes('query RepoHistory') && variables.after === 'c1') throw new Error('boom')
      return activityResponses(query, variables)
    })

    await expect(fetchActivityData(windows)).rejects.toThrow('boom')
  })
})

describe('fetchReposData', () => {
  it('maps repositories and aggregates language sizes into shares', async () => {
    mockGraphql.mockResolvedValue({
      fetchedAt: '2026-09-15T09:40:00.000Z',
      data: {
        user: {
          repositories: {
            nodes: [
              {
                name: 'alpha',
                description: 'Portfolio',
                url: 'https://github.com/sebascm-dev/alpha',
                isPrivate: false,
                pushedAt: '2026-09-14T23:34:00Z',
                stargazerCount: 1,
                forkCount: 0,
                primaryLanguage: { name: 'TypeScript' },
                issues: { totalCount: 2 },
                languages: { edges: [{ size: 900, node: { name: 'TypeScript' } }, { size: 100, node: { name: 'CSS' } }] },
                defaultBranchRef: { target: { history: { totalCount: 56 } } },
              },
              {
                name: 'beta',
                description: null,
                url: 'https://github.com/sebascm-dev/beta',
                isPrivate: true,
                pushedAt: null,
                stargazerCount: 0,
                forkCount: 0,
                primaryLanguage: null,
                issues: { totalCount: 0 },
                languages: { edges: [{ size: 1000, node: { name: 'TypeScript' } }] },
                defaultBranchRef: null,
              },
            ],
          },
        },
      },
    })

    const result = await fetchReposData()

    expect(result.fetchedAt).toBe('2026-09-15T09:40:00.000Z')
    expect(result.repos).toEqual([
      { name: 'alpha', description: 'Portfolio', url: 'https://github.com/sebascm-dev/alpha', isPrivate: false, primaryLanguage: 'TypeScript', stars: 1, forks: 0, openIssues: 2, pushedAt: '2026-09-14T23:34:00Z', totalCommits: 56 },
      { name: 'beta', description: null, url: 'https://github.com/sebascm-dev/beta', isPrivate: true, primaryLanguage: null, stars: 0, forks: 0, openIssues: 0, pushedAt: null, totalCommits: 0 },
    ])
    expect(result.languages).toEqual([
      { name: 'TypeScript', bytes: 1900, share: 0.95 },
      { name: 'CSS', bytes: 100, share: 0.05 },
    ])
  })

  it('returns no languages when every repository is empty', async () => {
    mockGraphql.mockResolvedValue({
      fetchedAt: '2026-09-15T09:40:00.000Z',
      data: { user: { repositories: { nodes: [] } } },
    })

    await expect(fetchReposData()).resolves.toMatchObject({ repos: [], languages: [] })
  })
})

describe('fetchHeroCommits', () => {
  const heroWindow = { start: '2026-09-01', end: '2026-09-15' }

  it('fetches only commit history and repo creations, starting one day early for Madrid time', async () => {
    const result = await fetchHeroCommits(heroWindow)

    const queries = mockGraphql.mock.calls.map(([query]) => String(query))
    expect(queries.some((query) => query.includes('query PullRequests'))).toBe(false)

    const sinces = mockGraphql.mock.calls
      .filter(([query]) => String(query).includes('query RepoHistory'))
      .map(([, variables]) => (variables as Variables).since)
    expect(new Set(sinces)).toEqual(new Set(['2026-08-31T00:00:00Z']))

    expect(result.commits.map((c) => c.oid).sort()).toEqual(['a1', 'a2', 'b1'])
    expect(result.repoCreations.map((repo) => repo.repo)).toEqual(['alpha', 'beta', 'empty'])
  })

  it('caches every GitHub request for an hour', async () => {
    await fetchHeroCommits(heroWindow)

    const revalidates = mockGraphql.mock.calls.map(([, , revalidate]) => revalidate)
    expect(revalidates.length).toBeGreaterThan(0)
    expect(new Set(revalidates)).toEqual(new Set([3600]))
  })
})
