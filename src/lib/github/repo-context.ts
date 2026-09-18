// Server-only: arma un resumen del contenido de un repo (árbol + una selección de archivos)
// para pasárselo a un modelo de texto. No pretende ser "todo el repo" literal — prioriza lo
// que de verdad cuenta la historia del proyecto y lo acota a un presupuesto razonable.
import { githubGraphql, parseGithubUrl, GithubAuthError, GithubRateLimitError, GithubUnavailableError } from './client'

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

const MAX_TOTAL_CHARS = 60_000
const MAX_FILE_CHARS = 8_000
const MAX_FILES = 40
const MAX_BLOB_SIZE_BYTES = 100_000
const BATCH_SIZE = 20

interface TreeEntry {
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

/** Cuanto más bajo, más prioridad — README y config primero, código de relleno al final */
function priority(path: string): number {
  const filename = path.split('/').pop()!.toLowerCase()
  if (/^readme/.test(filename)) return 0
  if (filename === 'package.json') return 1
  if (/config\.(js|ts|mjs|cjs|json)$/.test(filename) || filename === 'tailwind.config.ts') return 2
  if (/schema/.test(path.toLowerCase())) return 3
  if (/\/(page|layout)\.(tsx?|jsx?|vue|svelte)$/.test(path)) return 4
  if (path.includes('globals.css') || path.endsWith('.css')) return 4
  if (/\/(components|lib|src)\//.test(path)) return 5
  return 6
}

async function getDefaultBranch(owner: string, name: string): Promise<string | null> {
  const { data } = await githubGraphql<{ repository: { defaultBranchRef: { name: string } | null } | null }>(
    'query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { defaultBranchRef { name } } }',
    { owner, name },
    0
  )
  return data.repository?.defaultBranchRef?.name ?? null
}

async function getTree(owner: string, name: string, branch: string): Promise<TreeEntry[]> {
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
  return body.tree
}

async function getFileContents(owner: string, name: string, branch: string, paths: string[]): Promise<Map<string, string>> {
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

export interface RepoContextResult {
  /** Texto concatenado con encabezados por archivo, listo para pasarle a un modelo */
  context: string
  filesIncluded: string[]
  error?: string
}

export async function getRepoContext(repoUrl: string): Promise<RepoContextResult> {
  const parsed = parseGithubUrl(repoUrl)
  if (!parsed) return { context: '', filesIncluded: [], error: 'Eso no parece una URL de GitHub (github.com/usuario/repo).' }

  try {
    const branch = await getDefaultBranch(parsed.owner, parsed.name)
    if (!branch) return { context: '', filesIncluded: [], error: 'No se encontró ese repositorio (¿es privado y el token no tiene acceso?).' }

    const tree = await getTree(parsed.owner, parsed.name, branch)
    const candidates = tree
      .filter((entry) => entry.type === 'blob' && !isIgnored(entry.path) && (entry.size ?? 0) <= MAX_BLOB_SIZE_BYTES)
      .sort((a, b) => priority(a.path) - priority(b.path))
      .slice(0, MAX_FILES)

    if (candidates.length === 0) {
      return { context: '', filesIncluded: [], error: 'No encontré archivos de texto legibles en ese repo.' }
    }

    const contents = await getFileContents(parsed.owner, parsed.name, branch, candidates.map((entry) => entry.path))

    let budget = MAX_TOTAL_CHARS
    const parts: string[] = []
    const filesIncluded: string[] = []
    for (const entry of candidates) {
      const text = contents.get(entry.path)
      if (!text || budget <= 0) continue
      const trimmed = text.length > MAX_FILE_CHARS ? `${text.slice(0, MAX_FILE_CHARS)}\n… (truncado)` : text
      if (trimmed.length > budget) continue
      parts.push(`--- ${entry.path} ---\n${trimmed}`)
      filesIncluded.push(entry.path)
      budget -= trimmed.length
    }

    return { context: parts.join('\n\n'), filesIncluded }
  } catch (err) {
    if (err instanceof GithubAuthError) return { context: '', filesIncluded: [], error: 'GitHub rechazó el token de acceso.' }
    if (err instanceof GithubRateLimitError) return { context: '', filesIncluded: [], error: 'Se alcanzó el límite de peticiones a GitHub, probá en un rato.' }
    if (err instanceof GithubUnavailableError) return { context: '', filesIncluded: [], error: 'GitHub no respondió. ¿La URL es correcta y el repo es accesible?' }
    console.error('[getRepoContext error]', err)
    return { context: '', filesIncluded: [], error: 'No se pudo leer el repositorio.' }
  }
}
