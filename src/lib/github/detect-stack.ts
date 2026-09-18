// Server-only: detecta el stack tecnológico de un repo de GitHub para precargar el picker de stack.
import { githubGraphql, GithubAuthError, GithubRateLimitError, GithubUnavailableError } from './client'
import { TECH_OPTIONS } from '@/lib/tech-icons'

const TECH_NAMES = new Set(TECH_OPTIONS.map((tech) => tech.name))

/** Nombre de paquete npm (tal como aparece en package.json) → nombre del catálogo de tech-icons */
const PACKAGE_TO_TECH: Record<string, string> = {
  next: 'Next.js',
  react: 'React',
  typescript: 'TypeScript',
  tailwindcss: 'Tailwind CSS',
  vue: 'Vue.js',
  nuxt: 'Nuxt',
  nuxt3: 'Nuxt',
  svelte: 'Svelte',
  '@angular/core': 'Angular',
  express: 'Express',
  '@nestjs/core': 'NestJS',
  'drizzle-orm': 'Drizzle',
  prisma: 'Prisma',
  '@prisma/client': 'Prisma',
  '@supabase/supabase-js': 'Supabase',
  '@supabase/ssr': 'Supabase',
  firebase: 'Firebase',
  'firebase-admin': 'Firebase',
  mongodb: 'MongoDB',
  mongoose: 'MongoDB',
  redis: 'Redis',
  ioredis: 'Redis',
  graphql: 'GraphQL',
  vite: 'Vite',
  webpack: 'Webpack',
  jest: 'Jest',
  vitest: 'Vitest',
  'framer-motion': 'Framer Motion',
  motion: 'Framer Motion',
  zod: 'Zod',
  '@trpc/server': 'tRPC',
  '@trpc/client': 'tRPC',
  electron: 'Electron',
  astro: 'Astro',
  '@remix-run/react': 'Remix',
  'solid-js': 'Solid',
  expo: 'Expo',
  stripe: 'Stripe',
  openai: 'OpenAI',
  '@anthropic-ai/sdk': 'Anthropic',
  sass: 'Sass',
  'node-sass': 'Sass',
}

export interface DetectStackResult {
  techs: string[]
  /** La URL del "About" del repo (Website) — ahí suele estar dónde está desplegado */
  liveUrl?: string
  error?: string
}

/** Acepta https://github.com/owner/repo, con o sin barra/.git final */
function parseGithubUrl(url: string): { owner: string; name: string } | null {
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

interface RepoStackQuery {
  repository: {
    homepageUrl: string | null
    languages: { nodes: { name: string }[] } | null
    packageJson: { text: string } | null
  } | null
}

const QUERY = `
  query RepoStack($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      homepageUrl
      languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
        nodes { name }
      }
      packageJson: object(expression: "HEAD:package.json") {
        ... on Blob { text }
      }
    }
  }
`

export async function detectStackFromRepoUrl(url: string): Promise<DetectStackResult> {
  const parsed = parseGithubUrl(url)
  if (!parsed) return { techs: [], error: 'Eso no parece una URL de GitHub (github.com/usuario/repo).' }

  let data: RepoStackQuery
  try {
    ;({ data } = await githubGraphql<RepoStackQuery>(QUERY, parsed, 0))
  } catch (err) {
    if (err instanceof GithubAuthError) return { techs: [], error: 'GitHub rechazó el token de acceso.' }
    if (err instanceof GithubRateLimitError) return { techs: [], error: 'Se alcanzó el límite de peticiones a GitHub, probá en un rato.' }
    if (err instanceof GithubUnavailableError) return { techs: [], error: 'GitHub no respondió. ¿La URL es correcta y el repo es accesible?' }
    console.error('[detectStackFromRepoUrl error]', err)
    return { techs: [], error: 'No se pudo detectar el stack.' }
  }

  if (!data.repository) return { techs: [], error: 'No se encontró ese repositorio (¿es privado y el token no tiene acceso?).' }

  const found: string[] = []
  const seen = new Set<string>()
  const add = (name: string) => {
    if (!seen.has(name)) {
      seen.add(name)
      found.push(name)
    }
  }

  const packageJsonText = data.repository.packageJson?.text
  if (packageJsonText) {
    try {
      const pkg = JSON.parse(packageJsonText) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
      const packageNames = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]
      for (const packageName of packageNames) {
        const tech = PACKAGE_TO_TECH[packageName]
        if (tech) add(tech)
      }
    } catch {
      // package.json roto o no es JSON válido — seguimos solo con los lenguajes
    }
  }

  for (const language of data.repository.languages?.nodes ?? []) {
    if (TECH_NAMES.has(language.name)) add(language.name)
  }

  const rawHomepage = data.repository.homepageUrl?.trim()
  // GitHub deja guardar "celiamunozfisio.com" sin esquema — como href quedaría relativo y roto
  const liveUrl = rawHomepage ? (/^https?:\/\//i.test(rawHomepage) ? rawHomepage : `https://${rawHomepage}`) : undefined

  if (found.length === 0 && !liveUrl) {
    return { techs: [], error: packageJsonText ? 'No se reconoció ninguna tecnología conocida en ese repo.' : 'El repo no tiene package.json ni lenguajes reconocidos.' }
  }

  return { techs: found, liveUrl }
}
