'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { IconFolderCode } from '@tabler/icons-react'
import type { projects } from '@/lib/schema'
import type { InferSelectModel } from 'drizzle-orm'

type Project = InferSelectModel<typeof projects>

const CARD_LAYOUT = [
  { top: '0rem', left: '1.25rem', rotate: -6, pushX: -20, pushY: -12 },
  { top: '4.5rem', left: '0rem', rotate: 4, pushX: 22, pushY: 8 },
  { top: '9rem', left: '1.75rem', rotate: -3, pushX: -16, pushY: 18 },
]

export default function HeroProjectStack({ projects }: { projects: Project[] }) {
  const [hovered, setHovered] = useState<number | null>(null)

  const cards = projects.slice(0, 3)
  if (cards.length === 0) return null

  return (
    <div className="relative w-72 h-72">
      {cards.map((project, i) => {
        const layout = CARD_LAYOUT[i]
        const isHovered = hovered === i
        const isPushed = hovered !== null && !isHovered

        return (
          <motion.div
            key={project.id}
            className="absolute w-64 aspect-video"
            style={{ top: layout.top, left: layout.left, zIndex: isHovered ? 50 : 30 - i * 10 }}
            initial={false}
            animate={{
              rotate: isHovered ? 0 : layout.rotate,
              x: isPushed ? layout.pushX : 0,
              y: isHovered ? -14 : isPushed ? layout.pushY : 0,
              scale: isHovered ? 1.08 : isPushed ? 0.96 : 1,
            }}
            transition={{ type: 'spring', stiffness: 320, damping: 16, mass: 0.6 }}
            onHoverStart={() => setHovered(i)}
            onHoverEnd={() => setHovered(null)}
          >
            <Link
              href={`/proyectos/${project.slug}`}
              className="relative group block w-full h-full rounded-xl border border-white/15 bg-white/[0.06] backdrop-blur-2xl overflow-hidden shadow-2xl shadow-black/40"
            >
              <div className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent z-10" />
              <div className="absolute inset-0">
                {project.coverUrl ? (
                  <Image
                    src={project.coverUrl}
                    alt={`Portada de ${project.title}`}
                    fill
                    priority
                    sizes="256px"
                    className="object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#0a0a0a]">
                    <IconFolderCode size={22} className="text-white/10" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
              </div>
              <div className="absolute inset-x-0 bottom-0 p-3">
                <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent)] mb-1">
                  {i === 0 ? 'Último proyecto' : 'Proyecto'}
                </p>
                <p className="text-sm font-semibold text-white leading-tight truncate">
                  {project.title}
                </p>
              </div>
            </Link>
          </motion.div>
        )
      })}
    </div>
  )
}
