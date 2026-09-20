'use client'

import { useState } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { IconHome2, IconUser, IconFolderCode, IconBolt, IconMail, type TablerIcon } from '@tabler/icons-react'

const subLinks: { label: string; href: string; icon: TablerIcon }[] = [
  { label: 'Sobre mí', href: '#sobre-mi', icon: IconUser },
  { label: 'Proyectos', href: '#proyectos', icon: IconFolderCode },
  { label: 'Skills', href: '#skills', icon: IconBolt },
  { label: 'Contacto', href: '#contacto', icon: IconMail },
]

const panel: Variants = {
  hidden: { opacity: 0, x: -8, scale: 0.96 },
  show: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.2, ease: [0, 0, 0.2, 1], staggerChildren: 0.04, delayChildren: 0.03 },
  },
  exit: { opacity: 0, x: -8, scale: 0.96, transition: { duration: 0.15 } },
}

const panelItem: Variants = {
  hidden: { opacity: 0, x: -6 },
  show: { opacity: 1, x: 0 },
}

export default function DockNav() {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="fixed top-1/2 left-6 z-50 hidden -translate-y-1/2 md:block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* Trigger: Inicio — todo el resto de la navegación vive en el submenu */}
      <motion.a
        href="#hero"
        aria-label="Inicio"
        aria-expanded={open}
        whileHover={{ scale: 1.06 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18 }}
        className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] text-[var(--foreground)]/80 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-2xl transition-colors duration-200 hover:text-[var(--accent)]"
      >
        <div className="pointer-events-none absolute inset-x-1.5 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        <IconHome2 size={20} stroke={1.75} />
      </motion.a>

      <AnimatePresence>
        {open && (
          <motion.div
            variants={panel}
            initial="hidden"
            animate="show"
            exit="exit"
            className="absolute top-1/2 left-full ml-3 flex -translate-y-1/2 flex-col gap-1 rounded-2xl border border-white/15 bg-white/[0.06] p-2 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-2xl"
          >
            <div className="pointer-events-none absolute inset-x-1.5 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            {subLinks.map((link) => (
              <motion.a
                key={link.href}
                variants={panelItem}
                href={link.href}
                className="flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm text-[var(--foreground)]/70 transition-colors duration-200 hover:bg-white/10 hover:text-[var(--accent)]"
              >
                <link.icon size={16} stroke={1.75} />
                {link.label}
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
