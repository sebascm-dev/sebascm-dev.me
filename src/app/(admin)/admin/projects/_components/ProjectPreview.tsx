import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { IconBrandGithub, IconArrowUpRight, IconFolderCode } from '@tabler/icons-react'
import { findTechIcon } from '@/lib/tech-icons'
import { MARKDOWN_COMPONENTS } from '@/lib/markdown-components'

export interface ProjectPreviewData {
  title: string
  slug: string
  description: string
  techStack: string[]
  highlights: string[]
  status: string
  periodStart: string
  periodEnd: string
  content: string
  coverPreview: string | null
  liveUrl: string
  repoUrl: string
}

function formatPeriod(start: string, end: string): string | null {
  if (!start) return null
  return end ? `${start} — ${end}` : `${start} — actualidad`
}

/** Cómo se va a ver el proyecto publicado — misma pinta que /proyectos/[slug], en miniatura */
export function ProjectPreview({ data }: { data: ProjectPreviewData }) {
  return (
    <div className="flex flex-col h-full min-h-0 rounded-xl border border-[#1a1a1a] bg-black overflow-hidden">
      {/* Barra de "navegador" */}
      <div className="shrink-0 flex items-center gap-1.5 px-3 py-2 border-b border-[#1a1a1a] bg-[#0d0d0d]">
        <span className="w-2 h-2 rounded-full bg-[#2a2a2a]" />
        <span className="w-2 h-2 rounded-full bg-[#2a2a2a]" />
        <span className="w-2 h-2 rounded-full bg-[#2a2a2a]" />
        <span className="ml-2 font-mono text-[10px] text-gray-600 truncate">
          sebascm.dev/proyectos/{data.slug || '...'}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-6 py-6">
        {data.coverPreview ? (
          <div className="aspect-video rounded-xl overflow-hidden border border-[#1a1a1a] relative mb-6">
            <Image src={data.coverPreview} alt="" fill sizes="480px" className="object-cover" />
          </div>
        ) : (
          <div className="aspect-video rounded-xl border border-[#1a1a1a] mb-6 flex items-center justify-center bg-[#0d0d0d]">
            <IconFolderCode size={22} className="text-gray-700" />
          </div>
        )}

        <h1 className="text-xl font-bold text-white mb-2">{data.title || 'Título del proyecto'}</h1>

        {(data.status || formatPeriod(data.periodStart, data.periodEnd)) && (
          <p className="text-[10px] font-mono uppercase tracking-wide text-gray-600 mb-2">
            {[data.status, formatPeriod(data.periodStart, data.periodEnd)].filter(Boolean).join(' · ')}
          </p>
        )}

        {data.description && (
          <p className="text-gray-500 text-sm leading-relaxed mb-4">{data.description}</p>
        )}

        {data.highlights.length > 0 && (
          <ul className="mb-4 space-y-1">
            {data.highlights.map((highlight) => (
              <li key={highlight} className="text-gray-400 text-xs leading-relaxed pl-3 relative before:content-['—'] before:absolute before:left-0 before:text-[#22d3ee]">
                {highlight}
              </li>
            ))}
          </ul>
        )}

        {data.techStack.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {data.techStack.map((tech) => {
              const Icon = findTechIcon(tech)
              return (
                <span key={tech} className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wide bg-cyan-400/10 text-cyan-300/80 rounded-md">
                  {Icon && <Icon size={10} />}
                  {tech}
                </span>
              )
            })}
          </div>
        )}

        <div className="flex gap-2 mb-8">
          {data.liveUrl && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#22d3ee] text-black text-xs font-semibold rounded-lg">
              Ver demo <IconArrowUpRight size={12} />
            </span>
          )}
          {data.repoUrl && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#1a1a1a] text-gray-400 text-xs font-semibold rounded-lg">
              <IconBrandGithub size={12} /> Código
            </span>
          )}
        </div>

        {data.content && (
          <div className="prose-dark text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MARKDOWN_COMPONENTS}>{data.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
