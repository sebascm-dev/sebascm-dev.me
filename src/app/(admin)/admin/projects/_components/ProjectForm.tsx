'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import Image from 'next/image'
import {
  IconDeviceFloppy, IconLink, IconBrandGithub,
  IconPhoto, IconAlignLeft, IconFileText, IconWand, IconSparkles,
} from '@tabler/icons-react'
import { saveProject, detectProjectStack, generateProjectFromRepo, type ProjectActionResult } from '@/app/actions/projects'
import { toast } from '@/lib/toast'
import { ImageGallery } from './ImageGallery'
import { ProjectPreview } from './ProjectPreview'
import { TechStackPicker } from './TechStackPicker'
import { GeneratingOverlay } from './GeneratingOverlay'
import type { projects, projectImages } from '@/lib/schema'
import type { InferSelectModel } from 'drizzle-orm'

type Project = InferSelectModel<typeof projects> & { images?: InferSelectModel<typeof projectImages>[] }

const sectionLabel = 'text-xs font-semibold text-gray-500 uppercase tracking-widest font-[var(--font-fira-code)]'
const inputClass = 'bg-[#111] border border-[#1a1a1a] rounded-lg py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22d3ee] transition-colors w-full'
const FORM_ID = 'project-form'

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function linesToArray(value: string): string[] {
  return value.split('\n').map((line) => line.trim()).filter(Boolean)
}

/** Los marcadores <!-- CAPTURA: ... --> son invisibles al renderizar el markdown — esto los
 * saca para mostrarlos como checklist, porque si no no hay forma de saber dónde van las imágenes. */
function extractCapturaMarkers(content: string): string[] {
  return [...content.matchAll(/<!--\s*CAPTURA:\s*(.*?)\s*-->/g)].map((match) => match[1])
}

function SaveButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      form={FORM_ID}
      disabled={pending}
      className="cursor-pointer w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#22d3ee] text-black text-sm font-semibold rounded-lg hover:bg-[#06b6d4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <IconDeviceFloppy size={16} />
      {pending ? 'Guardando...' : 'Guardar proyecto'}
    </button>
  )
}

const initialState: ProjectActionResult = { success: false }

export function ProjectForm({ initialData }: { initialData: Project | null }) {
  const router = useRouter()
  const [state, formAction] = useActionState(saveProject, initialState)
  const coverRef = useRef<HTMLInputElement>(null)
  // Si arrancó en modo creación (sin initialData) o edición — fijo al montar. router.refresh()
  // vuelve a pasar un initialData con referencia nueva cada vez; si esto dependiera de esa prop
  // en vez de este estado fijado una sola vez, el efecto de abajo se re-dispararía en loop
  // (refresh → nuevo objeto → efecto → refresh → ...).
  const [wasCreateMode] = useState(() => !initialData)

  // Estado en vivo — solo lo que alimenta el preview de la derecha
  const [coverPreview, setCoverPreview] = useState<string | null>(initialData?.coverUrl ?? null)
  const coverUrl = initialData?.coverUrl ?? ''
  const coverKey = initialData?.coverKey ?? ''
  const [slug, setSlug] = useState(initialData?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(Boolean(initialData))
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [techStack, setTechStack] = useState<string[]>(initialData?.techStack ?? [])
  const [highlights, setHighlights] = useState((initialData?.highlights ?? []).join('\n'))
  const [features, setFeatures] = useState((initialData?.features ?? []).join('\n'))
  const [status, setStatus] = useState(initialData?.status ?? '')
  const [periodStart, setPeriodStart] = useState(initialData?.periodStart ?? '')
  const [periodEnd, setPeriodEnd] = useState(initialData?.periodEnd ?? '')
  const [liveUrl, setLiveUrl] = useState(initialData?.liveUrl ?? '')
  const [repoUrl, setRepoUrl] = useState(initialData?.repoUrl ?? '')
  const [content, setContent] = useState(initialData?.content ?? '')
  const [authorNotes, setAuthorNotes] = useState('')
  const [mockupIdeas, setMockupIdeas] = useState<string[]>([])
  const [isDetecting, startDetecting] = useTransition()
  const [isGenerating, startGenerating] = useTransition()

  const generateFromRepo = () => {
    startGenerating(async () => {
      const result = await generateProjectFromRepo(repoUrl, authorNotes)
      if (!result.success) {
        toast.error(result.error ?? 'No se pudo generar el proyecto.')
        return
      }

      if (result.title) setTitle(result.title)
      if (result.slug) {
        setSlug(result.slug)
        setSlugTouched(true)
      }
      if (result.description) setDescription(result.description)
      if (result.content) setContent(result.content)
      if (result.highlights) setHighlights(result.highlights.join('\n'))
      if (result.features) setFeatures(result.features.join('\n'))
      if (result.status) setStatus(result.status)
      if (result.periodStart) setPeriodStart(result.periodStart)
      if (result.periodEnd) setPeriodEnd(result.periodEnd)
      if (result.mockupIdeas) setMockupIdeas(result.mockupIdeas)
      if (!liveUrl.trim() && result.liveUrl) setLiveUrl(result.liveUrl)
      if (result.techStack) {
        const known = new Set(techStack.map((tech) => tech.toLowerCase()))
        const additions = result.techStack.filter((tech) => !known.has(tech.toLowerCase()))
        if (additions.length > 0) setTechStack([...techStack, ...additions])
      }

      toast.success('Proyecto generado a partir del repo.')
    })
  }

  const detectStack = () => {
    startDetecting(async () => {
      const result = await detectProjectStack(repoUrl)
      if (!result.success) {
        toast.error(result.error ?? 'No se pudo detectar el stack.')
        return
      }

      const known = new Set(techStack.map((tech) => tech.toLowerCase()))
      const additions = (result.techs ?? []).filter((tech) => !known.has(tech.toLowerCase()))
      if (additions.length > 0) setTechStack([...techStack, ...additions])

      // No pisa una URL que ya hayas puesto a mano
      const filledLiveUrl = !liveUrl.trim() && result.liveUrl
      if (filledLiveUrl) setLiveUrl(result.liveUrl!)

      const parts = []
      if (additions.length > 0) parts.push(`stack: ${additions.join(', ')}`)
      if (filledLiveUrl) parts.push(`URL en vivo: ${result.liveUrl}`)
      if (parts.length > 0) toast.success(`Detectado — ${parts.join(' · ')}`)
      else toast.info('No encontré nada nuevo para agregar.')
    })
  }

  useEffect(() => {
    if (state.success) {
      toast.success('Proyecto guardado.')
      // Al crear, saltamos a la edición: ahí ya se puede seguir subiendo mockups e imágenes
      if (wasCreateMode && state.id) router.push(`/admin/projects/${state.id}`)
      else router.refresh()
    } else if (state.error) {
      toast.error(state.error)
    }
  }, [state, wasCreateMode, router])

  const mockups = initialData?.images?.filter((image) => image.kind === 'mockup') ?? []
  const contentImages = initialData?.images?.filter((image) => image.kind === 'content') ?? []
  const captureMarkers = extractCapturaMarkers(content)

  return (
    <>
    <GeneratingOverlay key={isGenerating ? 'generating' : 'idle'} active={isGenerating} />
    <div className="flex flex-col gap-4" style={{ height: 'calc(100vh - 140px)' }}>
      <div className="flex gap-8 flex-1 min-h-0">
        {/* Columna izquierda — formulario */}
        <div className="flex flex-col gap-4 shrink-0" style={{ width: 640 }}>
          <div className="overflow-y-auto flex-1 pr-3 scrollbar-thin">
            <form id={FORM_ID} action={formAction} className="space-y-6">
              {initialData && <input type="hidden" name="id" value={initialData.id} />}
              <input type="hidden" name="existingCoverUrl" value={coverUrl} />
              <input type="hidden" name="existingCoverKey" value={coverKey} />

              {/* IDENTIDAD */}
              <section className="space-y-4">
                <div className="flex gap-3">
                  {/* Portada */}
                  <div
                    className="relative shrink-0 rounded-lg overflow-hidden bg-[#111] border border-[#1a1a1a] cursor-pointer group"
                    style={{ width: 200, height: 200 / 16 * 9 }}
                    onClick={() => coverRef.current?.click()}
                  >
                    {coverPreview ? (
                      <Image src={coverPreview} alt="Portada" fill sizes="200px" className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        <IconPhoto size={22} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-xs text-white">Cambiar portada</span>
                    </div>
                    <input
                      ref={coverRef}
                      type="file"
                      name="cover"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) setCoverPreview(URL.createObjectURL(file))
                      }}
                    />
                  </div>

                  <div className="flex-1 flex flex-col gap-3">
                    <div className="flex flex-col gap-1 min-w-0">
                      <label className="text-xs text-gray-500 font-[var(--font-fira-code)]">Título</label>
                      <input
                        type="text"
                        name="title"
                        required
                        value={title}
                        placeholder="Fisio Celia"
                        onChange={(e) => {
                          setTitle(e.target.value)
                          if (!slugTouched) setSlug(slugify(e.target.value))
                        }}
                        className={`${inputClass} px-3`}
                      />
                    </div>
                    <div className="flex flex-col gap-1 min-w-0">
                      <label className="text-xs text-gray-500 font-[var(--font-fira-code)]">Slug (URL)</label>
                      <input
                        type="text"
                        name="slug"
                        value={slug}
                        onChange={(e) => {
                          setSlugTouched(true)
                          setSlug(e.target.value)
                        }}
                        placeholder="fisio-celia"
                        className={`${inputClass} px-3 font-mono`}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-[var(--font-fira-code)]">
                    <span className="inline-flex items-center gap-1.5"><IconAlignLeft size={14} className="text-gray-600" />Descripción corta</span>
                  </label>
                  <textarea
                    name="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Lo que se ve en la tarjeta del home."
                    className={`${inputClass} px-3 py-2 resize-none`}
                  />
                </div>

                <TechStackPicker value={techStack} onChange={setTechStack} />
                <input type="hidden" name="techStack" value={techStack.join(', ')} />

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1 min-w-0">
                    <label className="text-xs text-gray-500 font-[var(--font-fira-code)]">URL en vivo</label>
                    <div className="relative">
                      <IconLink size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                      <input type="text" name="liveUrl" value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} placeholder="https://..." className={`${inputClass} pl-8 pr-3`} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <label className="text-xs text-gray-500 font-[var(--font-fira-code)]">Repositorio</label>
                    <div className="flex gap-1.5">
                      <div className="relative flex-1 min-w-0">
                        <IconBrandGithub size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                        <input type="text" name="repoUrl" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/..." className={`${inputClass} pl-8 pr-3`} />
                      </div>
                      <button
                        type="button"
                        onClick={detectStack}
                        disabled={isDetecting || !repoUrl.trim()}
                        title="Detectar stack desde el repositorio"
                        className="cursor-pointer shrink-0 inline-flex items-center justify-center w-9 rounded-lg border border-[#1a1a1a] text-gray-400 hover:text-[#22d3ee] hover:border-[#22d3ee]/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <IconWand size={15} className={isDetecting ? 'animate-pulse' : undefined} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-[var(--font-fira-code)]">Notas para la IA (opcional)</label>
                  <textarea
                    value={authorNotes}
                    onChange={(e) => setAuthorNotes(e.target.value)}
                    rows={3}
                    placeholder="Quién es el cliente, cómo trabajaba antes, cómo fue el proceso, resultados, alguna frase textual suya..."
                    className={`${inputClass} px-3 py-2 resize-none`}
                  />
                  <p className="text-[11px] text-gray-600">No está en el código — sin esto, el post no va a tener testimonio ni resultados.</p>
                </div>

                <button
                  type="button"
                  onClick={generateFromRepo}
                  disabled={isGenerating || !repoUrl.trim()}
                  className="cursor-pointer w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#22d3ee]/30 bg-[#22d3ee]/5 text-[#22d3ee] text-sm font-semibold hover:bg-[#22d3ee]/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <IconSparkles size={16} className={isGenerating ? 'animate-pulse' : undefined} />
                  {isGenerating ? 'Generando...' : 'Generar con IA desde el repo'}
                </button>

                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer h-[38px] w-16">
                    <input
                      type="checkbox"
                      name="published"
                      value="true"
                      defaultChecked={initialData?.published ?? false}
                      className="sr-only peer"
                    />
                    <div className="w-16 h-[38px] bg-[#111] border border-[#1a1a1a] rounded-lg peer-checked:bg-[#22d3ee] peer-checked:border-[#22d3ee] transition-colors duration-200" />
                    <div className="absolute left-[5px] top-1/2 -translate-y-1/2 w-[14px] h-[26px] bg-white/30 rounded-md shadow transition-all duration-200 peer-checked:translate-x-[40px] peer-checked:bg-white" />
                  </label>
                  <span className="text-sm text-gray-400">Publicado</span>
                </div>
              </section>

              {/* DETALLES */}
              <section className="space-y-4">
                <p className={sectionLabel}>Detalles</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1 min-w-0">
                    <label className="text-xs text-gray-500 font-[var(--font-fira-code)]">Estado</label>
                    <select
                      name="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className={`${inputClass} px-3`}
                    >
                      <option value="">Sin definir</option>
                      <option value="En producción">En producción</option>
                      <option value="En desarrollo">En desarrollo</option>
                      <option value="Prototipo">Prototipo</option>
                      <option value="Archivado">Archivado</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <label className="text-xs text-gray-500 font-[var(--font-fira-code)]">Inicio</label>
                    <input
                      type="text"
                      name="periodStart"
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                      placeholder="2025-03"
                      className={`${inputClass} px-3 font-mono`}
                    />
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <label className="text-xs text-gray-500 font-[var(--font-fira-code)]">Fin</label>
                    <input
                      type="text"
                      name="periodEnd"
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(e.target.value)}
                      placeholder="Vacío si sigue activo"
                      className={`${inputClass} px-3 font-mono`}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-[var(--font-fira-code)]">Highlights (uno por línea)</label>
                  <textarea
                    name="highlights"
                    value={highlights}
                    onChange={(e) => setHighlights(e.target.value)}
                    rows={3}
                    placeholder={'Pagos con Stripe y facturación automática por email'}
                    className={`${inputClass} px-3 py-2 resize-none`}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-[var(--font-fira-code)]">Funcionalidades (una por línea)</label>
                  <textarea
                    name="features"
                    value={features}
                    onChange={(e) => setFeatures(e.target.value)}
                    rows={4}
                    placeholder={'Reserva de citas con disponibilidad en tiempo real'}
                    className={`${inputClass} px-3 py-2 resize-none`}
                  />
                </div>
              </section>

              {/* CONTENIDO */}
              <section className="space-y-2">
                <p className={sectionLabel}>
                  <span className="inline-flex items-center gap-1.5"><IconFileText size={13} />Contexto (markdown)</span>
                </p>
                <textarea
                  name="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={12}
                  placeholder={'## El problema\n\n...\n\n## Qué hice\n\n...'}
                  className={`${inputClass} px-3 py-2 font-mono text-xs resize-y`}
                />
              </section>

              {/* GALERÍA — al elegir archivos se guarda el proyecto entero (crea si hace falta) y se suben en el mismo paso */}
              <section className="space-y-2">
                <p className={sectionLabel}>Mockups</p>
                {!initialData && <p className="text-xs text-gray-600">Al elegir imágenes se guarda el proyecto (necesita título) y se suben con él.</p>}
                {mockupIdeas.length > 0 && (
                  <ul className="rounded-lg border border-[#1a1a1a] bg-[#111] px-3 py-2 space-y-1">
                    {mockupIdeas.map((idea) => (
                      <li key={idea} className="text-xs text-gray-400 pl-3 relative before:content-['—'] before:absolute before:left-0 before:text-[#22d3ee]">
                        {idea}
                      </li>
                    ))}
                  </ul>
                )}
                <ImageGallery images={mockups} projectSlug={initialData?.slug ?? slug} />
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-gray-400 hover:text-[#22d3ee] transition-colors">
                  <input type="file" name="mockupImages" accept="image/*" multiple className="hidden" onChange={(e) => e.target.form?.requestSubmit()} />
                  + Subir mockups
                </label>
              </section>

              <section className="space-y-2">
                <p className={sectionLabel}>Imágenes del contenido</p>
                <p className="text-xs text-gray-600">Subí la imagen y copiá su markdown para pegarlo donde quieras dentro del contexto de arriba.</p>
                {captureMarkers.length > 0 && (
                  <ul className="rounded-lg border border-[#1a1a1a] bg-[#111] px-3 py-2 space-y-1">
                    {captureMarkers.map((marker, i) => (
                      <li key={`${marker}-${i}`} className="text-xs text-gray-400 pl-3 relative before:content-['—'] before:absolute before:left-0 before:text-[#22d3ee]">
                        {marker}
                      </li>
                    ))}
                  </ul>
                )}
                <ImageGallery images={contentImages} projectSlug={initialData?.slug ?? slug} showCopyUrl />
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-gray-400 hover:text-[#22d3ee] transition-colors">
                  <input type="file" name="contentImages" accept="image/*" multiple className="hidden" onChange={(e) => e.target.form?.requestSubmit()} />
                  + Subir imágenes
                </label>
              </section>
            </form>
          </div>
          <SaveButton />
        </div>

        {/* Columna derecha — preview de cómo va a quedar publicado */}
        <div className="flex flex-col gap-4 flex-1 min-h-0 min-w-0">
          <p className={sectionLabel}>Vista previa</p>
          <ProjectPreview
            data={{
              title,
              slug,
              description,
              techStack,
              highlights: linesToArray(highlights),
              status,
              periodStart,
              periodEnd,
              content,
              coverPreview,
              liveUrl,
              repoUrl,
            }}
          />
        </div>
      </div>
    </div>
    </>
  )
}
