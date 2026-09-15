import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import {
  getViewer,
  GITHUB_CACHE_TAG,
  githubGraphql,
  GithubAuthError,
  GithubRateLimitError,
  GithubUnavailableError,
} from '../client'

function jsonResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json', ...init.headers },
  })
}

type FetchInit = {
  method: string
  headers: Record<string, string>
  body: string
  next: { revalidate: number; tags: string[] }
}

describe('githubGraphql', () => {
  const originalToken = process.env.GITHUB_TOKEN

  beforeEach(() => {
    mockFetch.mockReset()
    process.env.GITHUB_TOKEN = 'test-token'
  })

  afterEach(() => {
    if (originalToken === undefined) delete process.env.GITHUB_TOKEN
    else process.env.GITHUB_TOKEN = originalToken
  })

  it('posts the query with the token and caches it for 5 minutes under the github tag', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ data: { ok: true } }, { headers: { date: 'Tue, 15 Sep 2026 09:58:00 GMT' } })
    )

    const result = await githubGraphql<{ ok: boolean }>('query Test { ok }', { a: 1 })

    expect(result).toEqual({ data: { ok: true }, fetchedAt: '2026-09-15T09:58:00.000Z' })
    const [url, init] = mockFetch.mock.calls[0] as [string, FetchInit]
    expect(url).toBe('https://api.github.com/graphql')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer test-token')
    expect(JSON.parse(init.body)).toEqual({ query: 'query Test { ok }', variables: { a: 1 } })
    expect(init.next).toEqual({ revalidate: 300, tags: [GITHUB_CACHE_TAG] })
  })

  it('accepts a custom cache lifetime', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: {} }))

    await githubGraphql('query Test { ok }', {}, 86400)

    const [, init] = mockFetch.mock.calls[0] as [string, FetchInit]
    expect(init.next.revalidate).toBe(86400)
  })

  it('fails with an auth error before calling GitHub when the token is missing', async () => {
    delete process.env.GITHUB_TOKEN

    await expect(githubGraphql('query Test { ok }')).rejects.toBeInstanceOf(GithubAuthError)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('maps 401 to an auth error', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: 'Bad credentials' }, { status: 401 }))
    await expect(githubGraphql('query Test { ok }')).rejects.toBeInstanceOf(GithubAuthError)
  })

  it('maps 403 without remaining quota and 429 to a rate-limit error', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ message: 'API rate limit exceeded' }, { status: 403, headers: { 'x-ratelimit-remaining': '0' } })
    )
    await expect(githubGraphql('query Test { ok }')).rejects.toBeInstanceOf(GithubRateLimitError)

    mockFetch.mockResolvedValueOnce(jsonResponse({ message: 'Too many requests' }, { status: 429 }))
    await expect(githubGraphql('query Test { ok }')).rejects.toBeInstanceOf(GithubRateLimitError)
  })

  it('maps any other 403 to an auth error', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: 'Resource not accessible' }, { status: 403 }))
    await expect(githubGraphql('query Test { ok }')).rejects.toBeInstanceOf(GithubAuthError)
  })

  it('maps server errors to an unavailable error', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: 'Server Error' }, { status: 502 }))
    await expect(githubGraphql('query Test { ok }')).rejects.toBeInstanceOf(GithubUnavailableError)
  })

  it('maps GraphQL errors in a 200 response', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ errors: [{ type: 'RATE_LIMITED', message: 'limit' }] }))
    await expect(githubGraphql('query Test { ok }')).rejects.toBeInstanceOf(GithubRateLimitError)

    mockFetch.mockResolvedValueOnce(jsonResponse({ errors: [{ type: 'NOT_FOUND', message: 'nope' }] }))
    await expect(githubGraphql('query Test { ok }')).rejects.toBeInstanceOf(GithubUnavailableError)
  })

  it('maps network failures to an unavailable error', async () => {
    mockFetch.mockRejectedValue(new TypeError('fetch failed'))
    await expect(githubGraphql('query Test { ok }')).rejects.toBeInstanceOf(GithubUnavailableError)
  })
})

describe('getViewer', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    process.env.GITHUB_TOKEN = 'test-token'
  })

  it('returns the authenticated user, cached for a day', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: { viewer: { id: 'U_1', login: 'sebascm-dev' } } }))

    await expect(getViewer()).resolves.toEqual({ id: 'U_1', login: 'sebascm-dev' })
    const [, init] = mockFetch.mock.calls[0] as [string, FetchInit]
    expect(init.next).toEqual({ revalidate: 86400, tags: [GITHUB_CACHE_TAG] })
  })
})
