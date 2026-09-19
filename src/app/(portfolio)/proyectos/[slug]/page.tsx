import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { IconArrowLeft, IconBrandGithub, IconArrowUpRight } from '@tabler/icons-react'
import { getPublishedProjectBySlug } from '@/app/actions/projects'
import { findTechIcon } from '@/lib/tech-icons'
import { MARKDOWN_COMPONENTS } from '@/lib/markdown-components'

function formatPeriod(start: string | null, end: string | null): string | null {
  if (!start) return null
  return end ? `${start} — ${end}` : `${start} — actualidad`
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const project = await getPublishedProjectBySlug(slug)
  if (!project) notFound()

  return (
    <article className="pt-32 pb-24">
      <div className="max-w-3xl mx-auto px-6">
        <Link
          href="/#proyectos"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--foreground)]/50 hover:text-[var(--accent)] transition-colors mb-8"
        >
          <IconArrowLeft size={14} /> Proyectos
        </Link>

        {project.coverUrl && (
          <div className="aspect-video rounded-2xl overflow-hidden border border-[var(--border)] relative mb-8">
            <Image src={project.coverUrl} alt={`Portada de ${project.title}`} fill sizes="768px" className="object-cover" priority />
          </div>
        )}

        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">{project.title}</h1>

        {(project.status || formatPeriod(project.periodStart, project.periodEnd)) && (
          <p className="text-xs font-mono uppercase tracking-wide text-[var(--foreground)]/40 mb-3">
            {[project.status, formatPeriod(project.periodStart, project.periodEnd)].filter(Boolean).join(' · ')}
          </p>
        )}

        {project.description && (
          <p className="text-[var(--foreground)]/60 text-base leading-relaxed mb-6">{project.description}</p>
        )}

        {project.highlights && project.highlights.length > 0 && (
          <ul className="mb-6 space-y-1.5">
            {project.highlights.map((highlight) => (
              <li key={highlight} className="text-[var(--foreground)]/70 text-sm leading-relaxed pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-[var(--accent)]">
                {highlight}
              </li>
            ))}
          </ul>
        )}

        {project.techStack && project.techStack.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {project.techStack.map((tech) => {
              const Icon = findTechIcon(tech)
              return (
                <span key={tech} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wide bg-cyan-400/10 text-cyan-300/80 rounded-md">
                  {Icon && <Icon size={11} />}
                  {tech}
                </span>
              )
            })}
          </div>
        )}

        <div className="flex gap-3 mb-12">
          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--accent)] text-[var(--background)] text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Ver demo <IconArrowUpRight size={14} />
            </a>
          )}
          {project.repoUrl && (
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-[var(--border)] text-[var(--foreground)]/70 text-sm font-semibold rounded-lg hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
            >
              <IconBrandGithub size={14} /> Código
            </a>
          )}
        </div>

        {project.content && (
          <div className="prose-dark">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MARKDOWN_COMPONENTS}>{project.content}</ReactMarkdown>
          </div>
        )}

        {project.images.filter((image) => image.kind === 'mockup').length > 0 && (
          <div className="mt-16 grid sm:grid-cols-2 gap-4">
            {project.images
              .filter((image) => image.kind === 'mockup')
              .map((image) => (
                <div key={image.id} className="aspect-video rounded-xl overflow-hidden border border-[var(--border)] relative">
                  <Image src={image.url} alt={`Mockup de ${project.title}`} fill sizes="384px" className="object-cover" />
                </div>
              ))}
          </div>
        )}
      </div>
    </article>
  )
}
