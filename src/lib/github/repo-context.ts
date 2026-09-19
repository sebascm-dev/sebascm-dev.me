// Server-only: primitivas para que un modelo explore un repo por su cuenta (árbol + lectura
// de archivos bajo demanda). node_modules/build/binarios/lockfiles se descartan del árbol
// porque no aportan nada — más allá de eso, no se prioriza ni se acota: decide el modelo.
import { githubGraphql, GithubAuthError, GithubRateLimitError, GithubUnavailableError } from './client'

const IGNORED_DIR_SEGMENTS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.vercel', 'coverage',
  '.turbo', '.cache', 'out', '.nuxt', '.svelte-kit', '.vscode', '.idea',
])
const IGNORED_FILENAMES = new Set([
  'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb', 'bun.lock',
  '.ds_store', 'favicon.ico',
])
const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'woff', 'woff2', 'ttf',
  'eot', 'otf', 'pdf', 'zip', 'mp4', 'mp3', 'wav', 'mov', 'avif', 'bmp',
])
const MAX_BLOB_SIZE_BYTES = 400_000
const BATCH_SIZE = 15

export interface TreeEntry {
  path: string
  type: 'blob' | 'tree' | 'commit'
  size?: number
}

function isIgnored(path: string): boolean {
  const segments = path.split('/')
  const filename = segments[segments.length - 1].toLowerCase()
  if (segments.some((segment) => IGNORED_DIR_SEGMENTS.has(segment))) return true
  if (IGNORED_FILENAMES.has(filename)) return true
  const ext = filename.split('.').pop() ?? ''
  if (BINARY_EXTENSIONS.has(ext)) return true
  return false
}

export async function getDefaultBranch(owner: string, name: string): Promise<string | null> {
  const { data } = await githubGraphql<{ repository: { defaultBranchRef: { name: string } | null } | null }>(
    'query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { defaultBranchRef { name } } }',
    { owner, name },
    0
  )
  return data.repository?.defaultBranchRef?.name ?? null
}

/** Árbol completo del repo, ya filtrado de ruido (node_modules, binarios, lockfiles, archivos enormes) */
export async function getFilteredTree(owner: string, name: string, branch: string): Promise<TreeEntry[]> {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new GithubAuthError('GITHUB_TOKEN is not set')

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${name}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'sebascm-dev-admin',
      },
      cache: 'no-store',
    }
  )

  if (response.status === 401) throw new GithubAuthError('GitHub rejected the token (401)')
  if (response.status === 403 || response.status === 429) throw new GithubRateLimitError(`GitHub rate limit reached (${response.status})`)
  if (!response.ok) throw new GithubUnavailableError(`GitHub responded ${response.status}`)

  const body = (await response.json()) as { tree: TreeEntry[]; truncated?: boolean }
  return body.tree.filter((entry) => entry.type === 'blob' && !isIgnored(entry.path) && (entry.size ?? 0) <= MAX_BLOB_SIZE_BYTES)
}

/**
 * Fecha del primer y último commit de la rama, en formato AAAA-MM — insumo para el campo
 * "period". Vía REST: la API GraphQL de historial no soporta pedir la última página sin un
 * cursor `before` — acá usamos el header `Link: rel="last"` (per_page=1, así que su número de
 * página es la cantidad total de commits) para llegar directo al primer commit.
 */
export async function getCommitDateRange(owner: string, name: string, branch: string): Promise<{ start: string | null; end: string | null }> {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new GithubAuthError('GITHUB_TOKEN is not set')

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'sebascm-dev-admin',
  }

  const latestResponse = await fetch(
    `https://api.github.com/repos/${owner}/${name}/commits?sha=${encodeURIComponent(branch)}&per_page=1`,
    { headers, cache: 'no-store' }
  )
  if (!latestResponse.ok) return { start: null, end: null }

  const latestCommits = (await latestResponse.json()) as { commit: { committer: { date: string } | null } }[]
  const end = latestCommits[0]?.commit.committer?.date ?? null

  const lastPageMatch = latestResponse.headers.get('link')?.match(/[?&]page=(\d+)[^>]*>;\s*rel="last"/)
  if (!lastPageMatch) {
    // Sin header Link — un solo commit en toda la rama
    const yearMonth = end ? end.slice(0, 7) : null
    return { start: yearMonth, end: yearMonth }
  }

  const firstResponse = await fetch(
    `https://api.github.com/repos/${owner}/${name}/commits?sha=${encodeURIComponent(branch)}&per_page=1&page=${lastPageMatch[1]}`,
    { headers, cache: 'no-store' }
  )
  if (!firstResponse.ok) return { start: null, end: end ? end.slice(0, 7) : null }

  const firstCommits = (await firstResponse.json()) as { commit: { committer: { date: string } | null } }[]
  const start = firstCommits[0]?.commit.committer?.date ?? null

  return { start: start ? start.slice(0, 7) : null, end: end ? end.slice(0, 7) : null }
}

/** Contenido de varios archivos en una sola tanda de queries GraphQL (alias por archivo) */
export async function getFileContents(owner: string, name: string, branch: string, paths: string[]): Promise<Map<string, string>> {
  const contents = new Map<string, string>()

  for (let i = 0; i < paths.length; i += BATCH_SIZE) {
    const batch = paths.slice(i, i + BATCH_SIZE)
    const fields = batch
      .map((path, idx) => `f${idx}: object(expression: ${JSON.stringify(`${branch}:${path}`)}) { ... on Blob { text } }`)
      .join('\n')
    const query = `query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { ${fields} } }`

    const { data } = await githubGraphql<{ repository: Record<string, { text: string | null } | null> | null }>(
      query,
      { owner, name },
      0
    )

    batch.forEach((path, idx) => {
      const text = data.repository?.[`f${idx}`]?.text
      if (text != null) contents.set(path, text)
    })
  }

  return contents
}
