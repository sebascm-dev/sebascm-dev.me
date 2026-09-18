import { requireAdmin } from '@/lib/auth'
import { listProjects } from '@/app/actions/projects'
import { ProjectsList } from './_components/ProjectsList'

export default async function ProjectsPage() {
  await requireAdmin()
  const projects = await listProjects()

  return (
    <div>
      <h1 className="sr-only">Proyectos</h1>
      <ProjectsList projects={projects} />
    </div>
  )
}
