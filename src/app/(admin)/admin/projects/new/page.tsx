import { requireAdmin } from '@/lib/auth'
import { ProjectForm } from '../_components/ProjectForm'

export default async function NewProjectPage() {
  await requireAdmin()

  return (
    <div>
      <h1 className="sr-only">Nuevo proyecto</h1>
      <ProjectForm initialData={null} />
    </div>
  )
}
