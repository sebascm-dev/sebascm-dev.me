// Server-only: reads GITHUB_TOKEN. Never import from client components.
// GraphQL transport with Next.js Data Cache and typed errors.

export const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql'
export const GITHUB_CACHE_TAG = 'github'
export const GITHUB_OWNER = 'sebascm-dev'

const DEFAULT_REVALIDATE_SECONDS = 300
const VIEWER_REVALIDATE_SECONDS = 86400

export class GithubAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GithubAuthError'
  }
}

export class GithubRateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GithubRateLimitError'
  }
}

export class GithubUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GithubUnavailableError'
  }
}

export interface GraphqlResult<T> {
  data: T
  /** When GitHub produced this response (kept by the Data Cache in the `date` header) */
  fetchedAt: string
}

interface GraphqlBody<T> {
  data?: T
  errors?: { type?: string; message?: string }[]
}

/**
 * POSTs a GraphQL query. In Next.js 16 `fetch` caches POST requests with an
 * Authorization header when opted in; the cache key includes the body, so every
 * query + variables combination is cached separately.
 */
export async function githubGraphql<T>(
  query: string,
  variables: Record<string, unknown> = {},
  revalidate: number = DEFAULT_REVALIDATE_SECONDS
): Promise<GraphqlResult<T>> {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new GithubAuthError('GITHUB_TOKEN is not set')

  let response: Response
  try {
    response = await fetch(GITHUB_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'sebascm-dev-admin',
      },
      body: JSON.stringify({ query, variables }),
      next: { revalidate, tags: [GITHUB_CACHE_TAG] },
    })
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new GithubUnavailableError(`GitHub request failed: ${reason}`)
  }

  const quotaExhausted = response.headers.get('x-ratelimit-remaining') === '0'
  if (response.status === 401) throw new GithubAuthError('GitHub rejected the token (401)')
  if (response.status === 429 || (response.status === 403 && quotaExhausted)) {
    throw new GithubRateLimitError(`GitHub rate limit reached (${response.status})`)
  }
  if (response.status === 403) throw new GithubAuthError('GitHub denied access (403)')
  if (!response.ok) throw new GithubUnavailableError(`GitHub responded ${response.status}`)

  const body = (await response.json()) as GraphqlBody<T>
  if (body.errors?.length) {
    if (body.errors.some((error) => error.type === 'RATE_LIMITED')) {
      throw new GithubRateLimitError('GitHub GraphQL rate limit reached')
    }
    // Partial data is never shown: counts would silently be wrong
    const messages = body.errors.map((error) => error.message ?? 'unknown').join('; ')
    throw new GithubUnavailableError(`GitHub GraphQL error: ${messages}`)
  }

  const date = response.headers.get('date')
  const fetchedAt = new Date(date ? Date.parse(date) : Date.now()).toISOString()
  return { data: body.data as T, fetchedAt }
}

/** Acepta https://github.com/owner/repo, con o sin barra/.git final */
export function parseGithubUrl(url: string): { owner: string; name: string } | null {
  try {
    const { hostname, pathname } = new URL(url)
    if (!hostname.endsWith('github.com')) return null
    const [owner, rawName] = pathname.replace(/^\/+/, '').split('/')
    if (!owner || !rawName) return null
    return { owner, name: rawName.replace(/\.git$/, '') }
  } catch {
    return null
  }
}

/** The authenticated user: its id filters commit history by author */
export async function getViewer(): Promise<{ id: string; login: string }> {
  const { data } = await githubGraphql<{ viewer: { id: string; login: string } }>(
    'query Viewer { viewer { id login } }',
    {},
    VIEWER_REVALIDATE_SECONDS
  )
  return data.viewer
}
