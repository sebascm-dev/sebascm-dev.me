import type { IconType } from 'react-icons'
import {
  SiNextdotjs, SiReact, SiTypescript, SiJavascript, SiTailwindcss, SiNodedotjs,
  SiPostgresql, SiMysql, SiSqlite, SiSupabase, SiFirebase, SiMongodb, SiRedis,
  SiGraphql, SiPrisma, SiVercel, SiNetlify, SiDocker, SiKubernetes, SiGooglecloud,
  SiCloudflare, SiPython, SiDjango, SiFlask, SiFastapi, SiGo, SiRust, SiPhp,
  SiLaravel, SiRubyonrails, SiVuedotjs, SiNuxt, SiSvelte, SiAngular, SiExpress,
  SiNestjs, SiHtml5, SiCss, SiSass, SiGit, SiGithub, SiGitlab, SiFigma, SiStripe,
  SiAnthropic, SiVite, SiWebpack, SiJest, SiVitest, SiPnpm, SiNpm,
  SiYarn, SiExpo, SiFramer, SiZod, SiTrpc, SiBun, SiDeno, SiElectron, SiAstro,
  SiRemix, SiSolid, SiSwift, SiKotlin, SiFlutter, SiDart, SiDrizzle,
} from 'react-icons/si'

export interface TechOption {
  name: string
  Icon: IconType
}

/** Catálogo curado para el buscador de stack — no es exhaustivo, y se puede añadir texto libre igual */
export const TECH_OPTIONS: TechOption[] = [
  { name: 'Next.js', Icon: SiNextdotjs },
  { name: 'React', Icon: SiReact },
  { name: 'TypeScript', Icon: SiTypescript },
  { name: 'JavaScript', Icon: SiJavascript },
  { name: 'Tailwind CSS', Icon: SiTailwindcss },
  { name: 'Node.js', Icon: SiNodedotjs },
  { name: 'PostgreSQL', Icon: SiPostgresql },
  { name: 'MySQL', Icon: SiMysql },
  { name: 'SQLite', Icon: SiSqlite },
  { name: 'Supabase', Icon: SiSupabase },
  { name: 'Firebase', Icon: SiFirebase },
  { name: 'MongoDB', Icon: SiMongodb },
  { name: 'Redis', Icon: SiRedis },
  { name: 'GraphQL', Icon: SiGraphql },
  { name: 'Prisma', Icon: SiPrisma },
  { name: 'Drizzle', Icon: SiDrizzle },
  { name: 'Vercel', Icon: SiVercel },
  { name: 'Netlify', Icon: SiNetlify },
  { name: 'Docker', Icon: SiDocker },
  { name: 'Kubernetes', Icon: SiKubernetes },
  { name: 'Google Cloud', Icon: SiGooglecloud },
  { name: 'Cloudflare', Icon: SiCloudflare },
  { name: 'Python', Icon: SiPython },
  { name: 'Django', Icon: SiDjango },
  { name: 'Flask', Icon: SiFlask },
  { name: 'FastAPI', Icon: SiFastapi },
  { name: 'Go', Icon: SiGo },
  { name: 'Rust', Icon: SiRust },
  { name: 'PHP', Icon: SiPhp },
  { name: 'Laravel', Icon: SiLaravel },
  { name: 'Ruby on Rails', Icon: SiRubyonrails },
  { name: 'Vue.js', Icon: SiVuedotjs },
  { name: 'Nuxt', Icon: SiNuxt },
  { name: 'Svelte', Icon: SiSvelte },
  { name: 'Angular', Icon: SiAngular },
  { name: 'Express', Icon: SiExpress },
  { name: 'NestJS', Icon: SiNestjs },
  { name: 'HTML5', Icon: SiHtml5 },
  { name: 'CSS', Icon: SiCss },
  { name: 'Sass', Icon: SiSass },
  { name: 'Git', Icon: SiGit },
  { name: 'GitHub', Icon: SiGithub },
  { name: 'GitLab', Icon: SiGitlab },
  { name: 'Figma', Icon: SiFigma },
  { name: 'Stripe', Icon: SiStripe },
  { name: 'Anthropic', Icon: SiAnthropic },
  { name: 'Vite', Icon: SiVite },
  { name: 'Webpack', Icon: SiWebpack },
  { name: 'Jest', Icon: SiJest },
  { name: 'Vitest', Icon: SiVitest },
  { name: 'pnpm', Icon: SiPnpm },
  { name: 'npm', Icon: SiNpm },
  { name: 'Yarn', Icon: SiYarn },
  { name: 'Expo', Icon: SiExpo },
  { name: 'Framer Motion', Icon: SiFramer },
  { name: 'Zod', Icon: SiZod },
  { name: 'tRPC', Icon: SiTrpc },
  { name: 'Bun', Icon: SiBun },
  { name: 'Deno', Icon: SiDeno },
  { name: 'Electron', Icon: SiElectron },
  { name: 'Astro', Icon: SiAstro },
  { name: 'Remix', Icon: SiRemix },
  { name: 'Solid', Icon: SiSolid },
  { name: 'Swift', Icon: SiSwift },
  { name: 'Kotlin', Icon: SiKotlin },
  { name: 'Flutter', Icon: SiFlutter },
  { name: 'Dart', Icon: SiDart },
]

const BY_LOWER_NAME = new Map(TECH_OPTIONS.map((tech) => [tech.name.toLowerCase(), tech]))

/** Icono para un nombre de tecnología guardado en la BD; null si no está en el catálogo (texto libre) */
export function findTechIcon(name: string): IconType | null {
  return BY_LOWER_NAME.get(name.toLowerCase())?.Icon ?? null
}
