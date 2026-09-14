'use client'

import { useState } from 'react'
import { toast } from '@/lib/toast'
import { sendContactEmail } from '@/app/actions/contact'
import { about } from '@/data/about'
import { SiGithub } from 'react-icons/si'
import { FaLinkedin } from 'react-icons/fa'
import { HiDocumentArrowDown } from 'react-icons/hi2'
import AnimatedInput from '@/components/ui/AnimatedInput'
import AnimatedTextarea from '@/components/ui/AnimatedTextarea'

interface FormState {
  name: string
  email: string
  message: string
}

export default function Contact() {
  const [form, setForm] = useState<FormState>({ name: '', email: '', message: '' })
  const [loading, setLoading] = useState(false)

  const validate = (): string => {
    if (!form.name.trim()) return 'El nombre es obligatorio.'
    if (!form.email.trim()) return 'El email es obligatorio.'
    if (!form.message.trim()) return 'El mensaje es obligatorio.'
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      toast.warning(validationError)
      return
    }
    setLoading(true)

    const result = await sendContactEmail(form)
    setLoading(false)

    if (result.success) {
      toast.success('¡Mensaje enviado! Te respondo a la brevedad.')
      setForm({ name: '', email: '', message: '' })
    } else {
      toast.error(result.error ?? 'No se pudo enviar el mensaje.')
    }
  }

  return (
    <section id="contacto" className="py-24 border-t border-[var(--border)]">
      <div className="max-w-5xl mx-auto px-6 w-full">
        <p className="font-mono text-sm text-[var(--accent)] mb-12 tracking-widest uppercase">
          Contacto
        </p>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Info */}
          <div>
            <h2 className="text-3xl font-bold mb-4 leading-tight">
              ¿Hablamos?
            </h2>
            <p className="text-[var(--foreground)]/60 leading-relaxed mb-8">
              Estoy buscando mi primera oportunidad profesional como desarrollador web junior. Si tenés un proyecto, una oferta o simplemente querés charlar, escribime.
            </p>

            <div className="flex flex-col gap-4">
              <a
                href={about.github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 text-sm text-[var(--foreground)]/60 hover:text-[var(--foreground)] transition-colors"
              >
                <SiGithub size={18} /> GitHub
              </a>
              <a
                href={about.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 text-sm text-[var(--foreground)]/60 hover:text-[var(--foreground)] transition-colors"
              >
                <FaLinkedin size={18} /> LinkedIn
              </a>
              <a
                href="/api/cv"
                className="inline-flex items-center gap-3 text-sm text-[var(--accent)] hover:opacity-80 transition-opacity"
              >
                <HiDocumentArrowDown size={18} /> Descargar CV
              </a>
            </div>
          </div>

          {/* Form */}
          <div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
              <div>
                <label htmlFor="name" className="block text-xs font-mono text-[var(--foreground)]/50 uppercase tracking-wider mb-2">
                  Nombre
                </label>
                <AnimatedInput
                  id="name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--foreground)] focus:border-[var(--accent)]"
                  placeholder="Tu nombre"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-mono text-[var(--foreground)]/50 uppercase tracking-wider mb-2">
                  Email
                </label>
                <AnimatedInput
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--foreground)] focus:border-[var(--accent)]"
                  placeholder="tu@email.com"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-xs font-mono text-[var(--foreground)]/50 uppercase tracking-wider mb-2">
                  Mensaje
                </label>
                <AnimatedTextarea
                  id="message"
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--foreground)] focus:border-[var(--accent)]"
                  placeholder="Contame en qué puedo ayudarte..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-[var(--accent)] text-[var(--background)] font-semibold text-sm rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Enviar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
