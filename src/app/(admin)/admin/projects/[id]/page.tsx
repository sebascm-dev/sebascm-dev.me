import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { getProjectWithImages } from '@/app/actions/projects'
import { ProjectForm } from '../_components/ProjectForm'

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const project = await getProjectWithImages(Number(id))
  if (!project) notFound()

  return (
    <div>
      <h1 className="sr-only">Editar {project.title}</h1>
      <ProjectForm initialData={project} />
    </div>
  )
}
