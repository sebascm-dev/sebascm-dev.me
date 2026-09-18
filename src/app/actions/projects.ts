'use server'

import { revalidatePath } from 'next/cache'
import { eq, desc, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { projects, projectImages } from '@/lib/schema'
import { uploadFile, deleteFile } from '@/lib/r2'
import { getAdminUser } from '@/lib/auth'
import { detectStackFromRepoUrl } from '@/lib/github/detect-stack'
import { getRepoContext } from '@/lib/github/repo-context'
import { parseGithubUrl } from '@/lib/github/client'
import { generateProjectBrief } from '@/lib/ai/generate-project-brief'
import { generateCoverImage } from '@/lib/ai/generate-cover-image'

export type ProjectActionResult = {
  success: boolean
  error?: string
  id?: number
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// --- Lecturas ---

export async function listProjects() {
  return db.select().from(projects).orderBy(desc(projects.createdAt))
}

export async function getProjectWithImages(id: number) {
  return db.query.projects.findFirst({
    where: eq(projects.id, id),
    with: { images: { orderBy: (image, { asc }) => asc(image.sortOrder) } },
  })
}

/** Últimos N proyectos publicados, para la home */
export async function getRecentPublishedProjects(limit = 3) {
  return db
    .select()
    .from(projects)
    .where(eq(projects.published, true))
    .orderBy(desc(projects.createdAt))
    .limit(limit)
}

/** Proyecto publicado por slug, con sus imágenes — para la página de detalle */
export async function getPublishedProjectBySlug(slug: string) {
  return db.query.projects.findFirst({
    where: and(eq(projects.slug, slug), eq(projects.published, true)),
    with: { images: { orderBy: (image, { asc }) => asc(image.sortOrder) } },
  })
}

// --- Escrituras ---

export async function saveProject(_prevState: ProjectActionResult, formData: FormData): Promise<ProjectActionResult> {
  const admin = await getAdminUser()
  if (!admin) return { success: false, error: 'No autorizado.' }

  try {
    const id = formData.get('id') ? Number(formData.get('id')) : null
    const title = (formData.get('title') as string)?.trim()
    if (!title) return { success: false, error: 'El título es obligatorio.' }

    const rawSlug = (formData.get('slug') as string)?.trim()
    const slug = slugify(rawSlug || title)
    if (!slug) return { success: false, error: 'El slug no puede quedar vacío.' }

    const techStack = (formData.get('techStack') as string)
      .split(',')
      .map((tech) => tech.trim())
      .filter(Boolean)

    // --- Portada ---
    let coverUrl = (formData.get('existingCoverUrl') as string) || null
    let coverKey = (formData.get('existingCoverKey') as string) || null
    const coverFile = formData.get('cover') as File | null

    if (coverFile && coverFile.size > 0) {
      if (coverKey) await deleteFile(coverKey)
      const buffer = Buffer.from(await coverFile.arrayBuffer())
      const key = `proyectos/${slug}/cover-${Date.now()}-${coverFile.name}`
      coverUrl = await uploadFile(buffer, key, coverFile.type)
      coverKey = key
    }

    const values = {
      slug,
      title,
      description: (formData.get('description') as string) || null,
      content: (formData.get('content') as string) || null,
      coverUrl,
      coverKey,
      techStack,
      liveUrl: (formData.get('liveUrl') as string) || null,
      repoUrl: (formData.get('repoUrl') as string) || null,
      published: formData.get('published') === 'true',
      updatedAt: new Date(),
    }

    let projectId = id
    if (id) {
      await db.update(projects).set(values).where(eq(projects.id, id))
    } else {
      const [created] = await db.insert(projects).values(values).returning({ id: projects.id })
      projectId = created.id
    }

    // --- Galería (mockups + imágenes del contenido) ---
    await uploadGalleryFiles(formData, 'mockupImages', 'mockup', slug, projectId!)
    await uploadGalleryFiles(formData, 'contentImages', 'content', slug, projectId!)

    revalidatePath('/admin/projects')
    revalidatePath('/')
    revalidatePath(`/proyectos/${slug}`)
    return { success: true, id: projectId! }
  } catch (err) {
    console.error('[saveProject error]', err)
    return { success: false, error: 'Error al guardar el proyecto.' }
  }
}

async function uploadGalleryFiles(formData: FormData, field: string, kind: 'mockup' | 'content', slug: string, projectId: number) {
  const files = formData.getAll(field) as File[]
  const existingCount = await db.$count(projectImages, and(eq(projectImages.projectId, projectId), eq(projectImages.kind, kind)))

  let sortOrder = existingCount
  for (const file of files) {
    if (!file || file.size === 0) continue
    const buffer = Buffer.from(await file.arrayBuffer())
    const key = `proyectos/${slug}/${kind}-${Date.now()}-${file.name}`
    const url = await uploadFile(buffer, key, file.type)
    await db.insert(projectImages).values({ projectId, url, key, kind, sortOrder: sortOrder++ })
  }
}

export async function deleteProject(id: number): Promise<ProjectActionResult> {
  const admin = await getAdminUser()
  if (!admin) return { success: false, error: 'No autorizado.' }

  try {
    const project = await getProjectWithImages(id)
    if (!project) return { success: false, error: 'Proyecto no encontrado.' }

    if (project.coverKey) await deleteFile(project.coverKey)
    for (const image of project.images) {
      await deleteFile(image.key)
    }

    await db.delete(projects).where(eq(projects.id, id))

    revalidatePath('/admin/projects')
    revalidatePath('/')
    return { success: true }
  } catch (err) {
    console.error('[deleteProject error]', err)
    return { success: false, error: 'Error al borrar el proyecto.' }
  }
}

export async function deleteProjectImage(imageId: number, projectSlug: string): Promise<ProjectActionResult> {
  const admin = await getAdminUser()
  if (!admin) return { success: false, error: 'No autorizado.' }

  try {
    const [image] = await db.select().from(projectImages).where(eq(projectImages.id, imageId))
    if (!image) return { success: false, error: 'Imagen no encontrada.' }

    await deleteFile(image.key)
    await db.delete(projectImages).where(eq(projectImages.id, imageId))

    revalidatePath('/admin/projects')
    revalidatePath(`/proyectos/${projectSlug}`)
    return { success: true }
  } catch (err) {
    console.error('[deleteProjectImage error]', err)
    return { success: false, error: 'Error al borrar la imagen.' }
  }
}

export type DetectStackResult = {
  success: boolean
  techs?: string[]
  liveUrl?: string
  error?: string
}

/** Lee dependencies/devDependencies, lenguajes y el "Website" del repo, y devuelve lo que encuentra */
export async function detectProjectStack(repoUrl: string): Promise<DetectStackResult> {
  const admin = await getAdminUser()
  if (!admin) return { success: false, error: 'No autorizado.' }
  if (!repoUrl.trim()) return { success: false, error: 'Pegá primero la URL del repositorio.' }

  const result = await detectStackFromRepoUrl(repoUrl.trim())
  if (result.error) return { success: false, error: result.error }
  return { success: true, techs: result.techs, liveUrl: result.liveUrl }
}

export type GenerateFromRepoResult = {
  success: boolean
  title?: string
  slug?: string
  description?: string
  content?: string
  coverUrl?: string
  coverKey?: string
  error?: string
  /** El texto sí se generó; solo falló la imagen — no es un error bloqueante */
  imageError?: string
}

/**
 * Lee el repo, le pide a OpenAI título/descripción/contexto en markdown + un prompt de imagen,
 * genera la portada y la sube a R2. Si ya había una portada (currentCoverKey), la reemplaza.
 */
export async function generateProjectFromRepo(repoUrl: string, currentCoverKey?: string): Promise<GenerateFromRepoResult> {
  const admin = await getAdminUser()
  if (!admin) return { success: false, error: 'No autorizado.' }
  if (!repoUrl.trim()) return { success: false, error: 'Pegá primero la URL del repositorio.' }
  if (!process.env.OPENAI_API_KEY) return { success: false, error: 'Falta configurar OPENAI_API_KEY en el servidor.' }

  const parsed = parseGithubUrl(repoUrl.trim())
  if (!parsed) return { success: false, error: 'Eso no parece una URL de GitHub (github.com/usuario/repo).' }

  const repoContext = await getRepoContext(repoUrl.trim())
  if (repoContext.error) return { success: false, error: repoContext.error }

  let brief
  try {
    brief = await generateProjectBrief(repoContext.context, parsed.name)
  } catch (err) {
    console.error('[generateProjectFromRepo brief error]', err)
    return { success: false, error: 'Falló la generación de texto con OpenAI.' }
  }

  const slug = slugify(brief.title) || slugify(parsed.name)

  let coverUrl: string | undefined
  let coverKey: string | undefined
  let imageError: string | undefined
  try {
    const imageBuffer = await generateCoverImage(brief.imagePrompt)
    const key = `proyectos/${slug}/cover-${Date.now()}.png`
    coverUrl = await uploadFile(imageBuffer, key, 'image/png')
    coverKey = key
    if (currentCoverKey) await deleteFile(currentCoverKey)
  } catch (err) {
    console.error('[generateProjectFromRepo image error]', err)
    imageError = 'El texto se generó bien, pero falló la imagen — probá el botón de nuevo o subí una portada a mano.'
  }

  return {
    success: true,
    title: brief.title,
    slug,
    description: brief.description,
    content: brief.content,
    coverUrl,
    coverKey,
    imageError,
  }
}
