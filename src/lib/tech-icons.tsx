import type { IconType } from 'react-icons'
import {
  // Frontend frameworks / meta-frameworks
  SiNextdotjs, SiReact, SiVuedotjs, SiNuxt, SiSvelte, SiAngular, SiSolid, SiQwik,
  SiAstro, SiRemix, SiPreact, SiEmberdotjs, SiAlpinedotjs, SiGatsby, SiDocusaurus,
  SiVitepress, SiEleventy, SiHugo, SiJekyll,
  // Lenguajes
  SiTypescript, SiJavascript, SiPython, SiGo, SiRust, SiPhp, SiRuby, SiKotlin,
  SiSwift, SiDart, SiCplusplus, SiFsharp, SiOpenjdk, SiElixir, SiHtml5, SiCss,
  // Estado / data fetching
  SiRedux, SiMobx, SiRecoil, SiXstate, SiReactquery, SiReactrouter, SiImmer,
  SiReacthookform, SiFormik,
  // UI / estilos
  SiTailwindcss, SiSass, SiLess, SiPostcss, SiStyledcomponents, SiBootstrap,
  SiChakraui, SiMui, SiRadixui, SiAntdesign, SiShadcnui, SiHeadlessui, SiFramer,
  // Backend
  SiNodedotjs, SiExpress, SiNestjs, SiFastify, SiKoa, SiDjango, SiFlask,
  SiFastapi, SiLaravel, SiRubyonrails, SiSpring, SiDotnet, SiHono,
  // Bases de datos / BaaS
  SiPostgresql, SiMysql, SiSqlite, SiMongodb, SiRedis, SiSupabase, SiFirebase,
  SiPlanetscale, SiNeon, SiTurso, SiCockroachlabs, SiApachecassandra, SiConvex,
  SiUpstash,
  // ORMs
  SiPrisma, SiDrizzle, SiTypeorm, SiSequelize, SiMongoose,
  // Cloud / hosting
  SiVercel, SiNetlify, SiGooglecloud, SiCloudflare, SiDigitalocean, SiRailway,
  SiRender, SiFlydotio,
  // Auth
  SiAuth0, SiClerk, SiOkta, SiLucia, SiBetterauth,
  // Pagos
  SiStripe, SiPaypal, SiSquare,
  // Email
  SiResend, SiMailgun,
  // Testing
  SiJest, SiVitest, SiCypress, SiTestinglibrary, SiMocha, SiSelenium,
  // Mobile
  SiExpo, SiFlutter, SiIonic, SiCapacitor, SiElectron,
  // CMS
  SiContentful, SiSanity, SiStrapi, SiWordpress, SiGhost, SiPayloadcms, SiDirectus,
  // DevOps / CI
  SiDocker, SiKubernetes, SiGithubactions, SiCircleci, SiJenkins, SiTerraform,
  SiAnsible,
  // Herramientas / build / calidad
  SiVite, SiWebpack, SiEsbuild, SiRollupdotjs, SiBabel, SiEslint, SiPrettier,
  SiStorybook, SiTurborepo, SiNx, SiMdx,
  // Gestores de paquetes
  SiPnpm, SiNpm, SiYarn, SiBun, SiDeno,
  // Control de versiones / diseño
  SiGit, SiGithub, SiGitlab, SiBitbucket, SiFigma, SiSketch,
  // Analítica / observabilidad
  SiGoogleanalytics, SiMixpanel, SiPosthog, SiSentry, SiDatadog,
  SiNewrelic, SiGrafana,
  // Realtime / colas / búsqueda
  SiSocketdotio, SiRabbitmq, SiPusher, SiAlgolia, SiElasticsearch, SiMeilisearch,
  // GraphQL / RPC
  SiGraphql, SiApollographql, SiTrpc,
  // Librerías varias
  SiZod, SiAxios, SiLodash, SiDatefns, SiChartdotjs, SiThreedotjs,
  // IA / datos
  SiAnthropic, SiHuggingface, SiTensorflow, SiPytorch,
  // SaaS / productividad
  SiNotion, SiLinear, SiDiscord, SiZapier, SiTrello, SiJira, SiPostman,
  // Google
  SiGoogle, SiGooglecalendar,
  // Otros
  SiSharp,
} from 'react-icons/si'

export interface TechOption {
  name: string
  Icon: IconType
}

/** Catálogo curado para el buscador de stack — no es exhaustivo, y se puede añadir texto libre igual */
export const TECH_OPTIONS: TechOption[] = [
  // Frontend frameworks / meta-frameworks
  { name: 'Next.js', Icon: SiNextdotjs },
  { name: 'React', Icon: SiReact },
  { name: 'Vue.js', Icon: SiVuedotjs },
  { name: 'Nuxt', Icon: SiNuxt },
  { name: 'Svelte', Icon: SiSvelte },
  { name: 'Angular', Icon: SiAngular },
  { name: 'Solid', Icon: SiSolid },
  { name: 'Qwik', Icon: SiQwik },
  { name: 'Astro', Icon: SiAstro },
  { name: 'Remix', Icon: SiRemix },
  { name: 'Preact', Icon: SiPreact },
  { name: 'Ember.js', Icon: SiEmberdotjs },
  { name: 'Alpine.js', Icon: SiAlpinedotjs },
  { name: 'Gatsby', Icon: SiGatsby },
  { name: 'Docusaurus', Icon: SiDocusaurus },
  { name: 'VitePress', Icon: SiVitepress },
  { name: 'Eleventy', Icon: SiEleventy },
  { name: 'Hugo', Icon: SiHugo },
  { name: 'Jekyll', Icon: SiJekyll },

  // Lenguajes
  { name: 'TypeScript', Icon: SiTypescript },
  { name: 'JavaScript', Icon: SiJavascript },
  { name: 'Python', Icon: SiPython },
  { name: 'Go', Icon: SiGo },
  { name: 'Rust', Icon: SiRust },
  { name: 'PHP', Icon: SiPhp },
  { name: 'Ruby', Icon: SiRuby },
  { name: 'Kotlin', Icon: SiKotlin },
  { name: 'Swift', Icon: SiSwift },
  { name: 'Dart', Icon: SiDart },
  { name: 'C++', Icon: SiCplusplus },
  { name: 'F#', Icon: SiFsharp },
  { name: 'Java', Icon: SiOpenjdk },
  { name: 'Elixir', Icon: SiElixir },
  { name: 'HTML5', Icon: SiHtml5 },
  { name: 'CSS', Icon: SiCss },

  // Estado / data fetching
  { name: 'Redux', Icon: SiRedux },
  { name: 'MobX', Icon: SiMobx },
  { name: 'Recoil', Icon: SiRecoil },
  { name: 'XState', Icon: SiXstate },
  { name: 'React Query', Icon: SiReactquery },
  { name: 'React Router', Icon: SiReactrouter },
  { name: 'Immer', Icon: SiImmer },
  { name: 'React Hook Form', Icon: SiReacthookform },
  { name: 'Formik', Icon: SiFormik },

  // UI / estilos
  { name: 'Tailwind CSS', Icon: SiTailwindcss },
  { name: 'Sass', Icon: SiSass },
  { name: 'Less', Icon: SiLess },
  { name: 'PostCSS', Icon: SiPostcss },
  { name: 'styled-components', Icon: SiStyledcomponents },
  { name: 'Bootstrap', Icon: SiBootstrap },
  { name: 'Chakra UI', Icon: SiChakraui },
  { name: 'MUI', Icon: SiMui },
  { name: 'Radix UI', Icon: SiRadixui },
  { name: 'Ant Design', Icon: SiAntdesign },
  { name: 'shadcn/ui', Icon: SiShadcnui },
  { name: 'Headless UI', Icon: SiHeadlessui },
  { name: 'Framer Motion', Icon: SiFramer },

  // Backend
  { name: 'Node.js', Icon: SiNodedotjs },
  { name: 'Express', Icon: SiExpress },
  { name: 'NestJS', Icon: SiNestjs },
  { name: 'Fastify', Icon: SiFastify },
  { name: 'Koa', Icon: SiKoa },
  { name: 'Django', Icon: SiDjango },
  { name: 'Flask', Icon: SiFlask },
  { name: 'FastAPI', Icon: SiFastapi },
  { name: 'Laravel', Icon: SiLaravel },
  { name: 'Ruby on Rails', Icon: SiRubyonrails },
  { name: 'Spring', Icon: SiSpring },
  { name: '.NET', Icon: SiDotnet },
  { name: 'Hono', Icon: SiHono },

  // Bases de datos / BaaS
  { name: 'PostgreSQL', Icon: SiPostgresql },
  { name: 'MySQL', Icon: SiMysql },
  { name: 'SQLite', Icon: SiSqlite },
  { name: 'MongoDB', Icon: SiMongodb },
  { name: 'Redis', Icon: SiRedis },
  { name: 'Supabase', Icon: SiSupabase },
  { name: 'Firebase', Icon: SiFirebase },
  { name: 'PlanetScale', Icon: SiPlanetscale },
  { name: 'Neon', Icon: SiNeon },
  { name: 'Turso', Icon: SiTurso },
  { name: 'CockroachDB', Icon: SiCockroachlabs },
  { name: 'Cassandra', Icon: SiApachecassandra },
  { name: 'Convex', Icon: SiConvex },
  { name: 'Upstash', Icon: SiUpstash },

  // ORMs
  { name: 'Prisma', Icon: SiPrisma },
  { name: 'Drizzle', Icon: SiDrizzle },
  { name: 'TypeORM', Icon: SiTypeorm },
  { name: 'Sequelize', Icon: SiSequelize },
  { name: 'Mongoose', Icon: SiMongoose },

  // Cloud / hosting
  { name: 'Vercel', Icon: SiVercel },
  { name: 'Netlify', Icon: SiNetlify },
  { name: 'Google Cloud', Icon: SiGooglecloud },
  { name: 'Cloudflare', Icon: SiCloudflare },
  { name: 'DigitalOcean', Icon: SiDigitalocean },
  { name: 'Railway', Icon: SiRailway },
  { name: 'Render', Icon: SiRender },
  { name: 'Fly.io', Icon: SiFlydotio },

  // Auth
  { name: 'Auth0', Icon: SiAuth0 },
  { name: 'Clerk', Icon: SiClerk },
  { name: 'Okta', Icon: SiOkta },
  { name: 'Lucia', Icon: SiLucia },
  { name: 'Better Auth', Icon: SiBetterauth },

  // Pagos
  { name: 'Stripe', Icon: SiStripe },
  { name: 'PayPal', Icon: SiPaypal },
  { name: 'Square', Icon: SiSquare },

  // Email
  { name: 'Resend', Icon: SiResend },
  { name: 'Mailgun', Icon: SiMailgun },

  // Testing
  { name: 'Jest', Icon: SiJest },
  { name: 'Vitest', Icon: SiVitest },
  { name: 'Cypress', Icon: SiCypress },
  { name: 'Testing Library', Icon: SiTestinglibrary },
  { name: 'Mocha', Icon: SiMocha },
  { name: 'Selenium', Icon: SiSelenium },

  // Mobile
  { name: 'Expo', Icon: SiExpo },
  { name: 'Flutter', Icon: SiFlutter },
  { name: 'Ionic', Icon: SiIonic },
  { name: 'Capacitor', Icon: SiCapacitor },
  { name: 'Electron', Icon: SiElectron },

  // CMS
  { name: 'Contentful', Icon: SiContentful },
  { name: 'Sanity', Icon: SiSanity },
  { name: 'Strapi', Icon: SiStrapi },
  { name: 'WordPress', Icon: SiWordpress },
  { name: 'Ghost', Icon: SiGhost },
  { name: 'Payload CMS', Icon: SiPayloadcms },
  { name: 'Directus', Icon: SiDirectus },

  // DevOps / CI
  { name: 'Docker', Icon: SiDocker },
  { name: 'Kubernetes', Icon: SiKubernetes },
  { name: 'GitHub Actions', Icon: SiGithubactions },
  { name: 'CircleCI', Icon: SiCircleci },
  { name: 'Jenkins', Icon: SiJenkins },
  { name: 'Terraform', Icon: SiTerraform },
  { name: 'Ansible', Icon: SiAnsible },

  // Herramientas / build / calidad
  { name: 'Vite', Icon: SiVite },
  { name: 'Webpack', Icon: SiWebpack },
  { name: 'esbuild', Icon: SiEsbuild },
  { name: 'Rollup', Icon: SiRollupdotjs },
  { name: 'Babel', Icon: SiBabel },
  { name: 'ESLint', Icon: SiEslint },
  { name: 'Prettier', Icon: SiPrettier },
  { name: 'Storybook', Icon: SiStorybook },
  { name: 'Turborepo', Icon: SiTurborepo },
  { name: 'Nx', Icon: SiNx },
  { name: 'MDX', Icon: SiMdx },

  // Gestores de paquetes
  { name: 'pnpm', Icon: SiPnpm },
  { name: 'npm', Icon: SiNpm },
  { name: 'Yarn', Icon: SiYarn },
  { name: 'Bun', Icon: SiBun },
  { name: 'Deno', Icon: SiDeno },

  // Control de versiones / diseño
  { name: 'Git', Icon: SiGit },
  { name: 'GitHub', Icon: SiGithub },
  { name: 'GitLab', Icon: SiGitlab },
  { name: 'Bitbucket', Icon: SiBitbucket },
  { name: 'Figma', Icon: SiFigma },
  { name: 'Sketch', Icon: SiSketch },

  // Analítica / observabilidad
  { name: 'Google Analytics', Icon: SiGoogleanalytics },
  { name: 'Mixpanel', Icon: SiMixpanel },
  { name: 'PostHog', Icon: SiPosthog },
  { name: 'Sentry', Icon: SiSentry },
  { name: 'Datadog', Icon: SiDatadog },
  { name: 'New Relic', Icon: SiNewrelic },
  { name: 'Grafana', Icon: SiGrafana },

  // Realtime / colas / búsqueda
  { name: 'Socket.IO', Icon: SiSocketdotio },
  { name: 'RabbitMQ', Icon: SiRabbitmq },
  { name: 'Pusher', Icon: SiPusher },
  { name: 'Algolia', Icon: SiAlgolia },
  { name: 'Elasticsearch', Icon: SiElasticsearch },
  { name: 'Meilisearch', Icon: SiMeilisearch },

  // GraphQL / RPC
  { name: 'GraphQL', Icon: SiGraphql },
  { name: 'Apollo GraphQL', Icon: SiApollographql },
  { name: 'tRPC', Icon: SiTrpc },

  // Librerías varias
  { name: 'Zod', Icon: SiZod },
  { name: 'Axios', Icon: SiAxios },
  { name: 'Lodash', Icon: SiLodash },
  { name: 'date-fns', Icon: SiDatefns },
  { name: 'Chart.js', Icon: SiChartdotjs },
  { name: 'Three.js', Icon: SiThreedotjs },

  // IA / datos
  { name: 'Anthropic', Icon: SiAnthropic },
  { name: 'Hugging Face', Icon: SiHuggingface },
  { name: 'TensorFlow', Icon: SiTensorflow },
  { name: 'PyTorch', Icon: SiPytorch },

  // SaaS / productividad
  { name: 'Notion', Icon: SiNotion },
  { name: 'Linear', Icon: SiLinear },
  { name: 'Discord', Icon: SiDiscord },
  { name: 'Zapier', Icon: SiZapier },
  { name: 'Trello', Icon: SiTrello },
  { name: 'Jira', Icon: SiJira },
  { name: 'Postman', Icon: SiPostman },

  // Google
  { name: 'Google', Icon: SiGoogle },
  { name: 'Google Calendar', Icon: SiGooglecalendar },

  // Otros
  { name: 'Sharp', Icon: SiSharp },
]

const BY_LOWER_NAME = new Map(TECH_OPTIONS.map((tech) => [tech.name.toLowerCase(), tech]))
// Del más largo al más corto, para que un prefijo compuesto ("Google Calendar") gane sobre uno
// más genérico ("Google") cuando ambos podrían matchear.
const OPTIONS_BY_LENGTH_DESC = [...TECH_OPTIONS].sort((a, b) => b.name.length - a.name.length)

/** Saca sufijos genéricos ("API", "SDK", "CLI", "Renderer"...) y el scope de un paquete npm (@scope/) */
function normalize(name: string): string {
  return name
    .replace(/^@[^/]+\//, '')
    .replace(/\s+(api|sdk|cli|renderer|library|lib)$/i, '')
    .trim()
}

/**
 * Icono para un nombre de tecnología guardado en la BD; null si no está en el catálogo.
 * Prueba match exacto, luego el nombre normalizado (sin "API"/"SDK"/scope de npm...), y por
 * último si el nombre empieza con el de una entrada del catálogo (ej. "React Signature Canvas"
 * → ícono de React) — así una entrada que la IA nombra distinto igual muestra algo razonable.
 */
export function findTechIcon(name: string): IconType | null {
  const exact = BY_LOWER_NAME.get(name.toLowerCase())
  if (exact) return exact.Icon

  const normalized = normalize(name)
  const normalizedMatch = BY_LOWER_NAME.get(normalized.toLowerCase())
  if (normalizedMatch) return normalizedMatch.Icon

  const lowerNormalized = normalized.toLowerCase()
  const prefixMatch = OPTIONS_BY_LENGTH_DESC.find((tech) => {
    const lowerTech = tech.name.toLowerCase()
    return lowerNormalized.startsWith(`${lowerTech} `) || lowerNormalized === lowerTech
  })
  return prefixMatch?.Icon ?? null
}
