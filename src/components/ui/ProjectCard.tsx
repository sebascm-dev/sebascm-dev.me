import Image from 'next/image'
import Link from 'next/link'
import { IconBrandGithub, IconArrowUpRight, IconFolderCode } from '@tabler/icons-react'
import { findTechIcon } from '@/lib/tech-icons'
import type { projects } from '@/lib/schema'
import type { InferSelectModel } from 'drizzle-orm'

type Project = InferSelectModel<typeof projects>

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="group relative rounded-2xl border border-[var(--border)] bg-[#0a0a0a] overflow-hidden hover:border-[var(--accent)]/40 transition-colors duration-300">
      <Link href={`/proyectos/${project.slug}`} className="absolute inset-0 z-10" aria-label={`Ver ${project.title}`} />

      <div className="aspect-video bg-black relative overflow-hidden">
        {project.coverUrl ? (
          <Image
            src={project.coverUrl}
            alt={`Portada de ${project.title}`}
            fill
            sizes="(max-width: 768px) 100vw, 640px"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <IconFolderCode size={28} className="text-white/10" />
          </div>
        )}
      </div>

      <div className="p-6 sm:p-8 relative">
        <h3 className="text-xl font-bold mb-2 text-white">{project.title}</h3>
        <p className="text-[var(--foreground)]/60 text-sm leading-relaxed mb-4">{project.description}</p>

        {project.techStack && project.techStack.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {project.techStack.map((tech) => {
              const Icon = findTechIcon(tech)
              return (
                <span
                  key={tech}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wide bg-cyan-400/10 text-cyan-300/80 rounded-md"
                >
                  {Icon && <Icon size={11} />}
                  {tech}
                </span>
              )
            })}
          </div>
        )}

        <div className="flex gap-3 relative z-20">
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
      </div>
    </div>
  )
}
