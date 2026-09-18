'use client'

import { motion, Variants } from 'framer-motion'
import { about } from '@/data/about'
import ActivityGraph from '@/components/ui/ActivityGraph'
import { IconArrowDown, IconMapPin, IconDownload, IconMail } from '@tabler/icons-react'
import type { profile as profileTable } from '@/lib/schema'
import type { InferSelectModel } from 'drizzle-orm'

type Profile = InferSelectModel<typeof profileTable>

interface HeroProps {
  profile?: Profile | null
}

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
}

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0, 0, 0.58, 1] } },
}

export default function Hero({ profile }: HeroProps) {
  // Nombre: del perfil si está completo, fallback a about
  const firstName = profile?.firstName ?? about.name.split(' ')[0]
  const lastName = [profile?.lastName1, profile?.lastName2].filter(Boolean).join(' ') || about.name.split(' ').slice(1).join(' ')

  // Rol y bio/tagline
  const role = profile?.degree ?? profile?.jobTitle ?? about.role
  const tagline = profile?.bio ?? about.tagline

  // Localización: localidad + provincia si están disponibles, fallback estático
  const location = (profile?.location && profile?.province)
    ? `${profile.location}, ${profile.province}`
    : profile?.location
    ?? profile?.province
    ?? 'Huelva, España'

  // Disponibilidad
  const available = profile?.available ?? true
  return (
    <section
      id="hero"
      className="min-h-screen flex flex-col pointer-events-none relative overflow-hidden"
    >
      {/* Fades permanentes — siempre visibles desde el inicio */}
      <div className="absolute inset-x-0 top-0 h-24 pointer-events-none z-10" style={{ background: 'linear-gradient(to bottom, #0a0a0a, rgba(10,10,10,0))' }} />
      <div className="absolute inset-x-0 bottom-0 h-[40%] pointer-events-none z-10" style={{ background: 'linear-gradient(to top, #0a0a0a, rgba(10,10,10,0))' }} />

      <ActivityGraph />

      {/* Contenido: anclado arriba para dejar libre la zona de los picos del gráfico */}
      <div className="flex-1 flex items-start">
        {/* pb-56: reserva sitio bajo los botones para el gráfico de actividad en pantallas bajas */}
        {/* El contenedor deja pasar el ratón al gráfico; solo el contenido real lo captura */}
        <div className="w-full max-w-5xl mx-auto px-6 pt-24 sm:pt-28 pb-56 pointer-events-none relative z-10">
          <motion.div variants={container} initial="hidden" animate="show" className="pointer-events-auto">

            {/* Badge estado laboral */}
            <motion.div variants={item} className="mb-8 flex items-center gap-4">
              {available ? (
                <>
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[11px] font-medium tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Disponible para trabajar
                  </span>
                  {profile?.jobTitle && (
                    <span className="text-[11px] text-[var(--foreground)]/35 font-medium tracking-wide">
                      {profile.jobTitle}
                    </span>
                  )}
                </>
              ) : (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-sky-500/20 bg-sky-500/5 text-sky-400 text-[11px] font-medium tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  {profile?.jobTitle ? `Trabajando en ${profile.jobTitle}` : 'No disponible'}
                </span>
              )}
            </motion.div>

            {/* Nombre */}
            <motion.p
              variants={item}
              className="font-mono text-xs text-[var(--accent)] mb-5 tracking-[0.25em] uppercase"
            >
              Hola, soy
            </motion.p>

            <motion.h1
              variants={item}
              className="text-6xl sm:text-8xl font-bold tracking-tight leading-[0.9] mb-5"
            >
              {firstName}
              <br />
              <span className="text-[var(--foreground)]/25">{lastName}</span>
            </motion.h1>

            {/* Rol con línea decorativa */}
            <motion.div variants={item} className="flex items-center gap-3 mb-5">
              <div className="h-[1px] w-8 bg-[var(--accent)]/40" />
              <p className="text-lg sm:text-xl text-[var(--accent)] font-medium">
                {role}
              </p>
            </motion.div>

            <motion.p
              variants={item}
              className="text-sm sm:text-base text-[var(--foreground)]/50 max-w-xl leading-relaxed mb-10"
            >
              {tagline}
            </motion.p>

            {/* CTAs + localización (data-hero-actions: el gráfico de actividad empieza justo debajo) */}
            <motion.div data-hero-actions variants={item} className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {profile?.cvUrl && (
                <a
                  href="/api/cv"
                  className="inline-flex items-center gap-2 justify-center px-6 py-2.5 bg-[var(--accent)] text-[var(--background)] font-semibold text-sm rounded-lg hover:opacity-90 transition-opacity"
                >
                  <IconDownload size={16} />
                  Descargar CV
                </a>
              )}
              <a
                href="#contacto"
                className="inline-flex items-center gap-2 justify-center px-6 py-2.5 border border-[var(--border)] text-[var(--foreground)]/60 font-semibold text-sm rounded-lg hover:border-[var(--accent)]/50 hover:text-[var(--accent)] transition-colors"
              >
                <IconMail size={16} />
                Contactar
              </a>
              <span className="hidden sm:flex items-center gap-1.5 text-[var(--foreground)]/30 text-xs ml-2">
                <IconMapPin size={12} />
                {location}
              </span>
            </motion.div>

          </motion.div>
        </div>
      </div>

      {/* Indicador de scroll */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[var(--foreground)]/20 pointer-events-none z-10"
      >
        <span className="text-[10px] font-mono tracking-[0.2em] uppercase">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
        >
          <IconArrowDown size={14} />
        </motion.div>
      </motion.div>
    </section>
  )
}
