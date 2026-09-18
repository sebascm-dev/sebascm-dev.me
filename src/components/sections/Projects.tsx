'use client'

import { motion } from 'framer-motion'
import ProjectCard from '@/components/ui/ProjectCard'
import type { projects } from '@/lib/schema'
import type { InferSelectModel } from 'drizzle-orm'

type Project = InferSelectModel<typeof projects>

export default function Projects({ projects }: { projects: Project[] }) {
  if (projects.length === 0) return null

  return (
    <section id="proyectos" className="py-24 border-t border-[var(--border)] pointer-events-none relative z-10 bg-[var(--background)]">
      <div className="max-w-5xl mx-auto px-6 py-24 w-full pointer-events-auto">
        <div className="mb-12">
          <p className="font-mono text-sm text-[var(--accent)] tracking-widest uppercase">
            Proyectos
          </p>
          <p className="mt-2 text-[var(--foreground)]/40 text-sm">
            Lo último en lo que estuve trabajando.
          </p>
        </div>

        <div className="grid gap-8">
          {projects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: 'easeOut' }}
            >
              <ProjectCard project={project} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
