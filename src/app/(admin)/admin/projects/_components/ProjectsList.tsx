'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { IconPlus, IconTrash, IconFolderCode, IconPencil } from '@tabler/icons-react'
import { deleteProject } from '@/app/actions/projects'
import { toast } from '@/lib/toast'
import type { projects } from '@/lib/schema'
import type { InferSelectModel } from 'drizzle-orm'

type Project = InferSelectModel<typeof projects>

function DeleteButton({ id, title }: { id: number; title: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    if (!confirm(`¿Borrar "${title}"? Esto también borra sus imágenes de R2.`)) return
    startTransition(async () => {
      const result = await deleteProject(id)
      if (result.success) {
        toast.success('Proyecto borrado.')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Error al borrar el proyecto.')
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-[#1a1a1a] px-2.5 py-1.5 text-xs text-gray-400 hover:text-red-400 hover:border-red-400/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <IconTrash size={13} />
      {isPending ? 'Borrando…' : 'Borrar'}
    </button>
  )
}

export function ProjectsList({ projects }: { projects: Project[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest font-[var(--font-fira-code)]">
          {projects.length} {projects.length === 1 ? 'proyecto' : 'proyectos'}
        </p>
        <Link
          href="/admin/projects/new"
          className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-[#22d3ee] text-black text-sm font-semibold rounded-lg hover:bg-[#06b6d4] transition-colors"
        >
          <IconPlus size={16} />
          Nuevo proyecto
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-12 text-center flex flex-col items-center gap-3">
          <IconFolderCode size={32} className="text-gray-700" />
          <p className="text-gray-500 text-sm">Todavía no hay proyectos.</p>
        </div>
      ) : (
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl overflow-hidden divide-y divide-[#1a1a1a]">
          {projects.map((project) => (
            <div key={project.id} className="flex items-center gap-4 px-4 py-3 hover:bg-[#111] transition-colors">
              <div className="shrink-0 w-16 h-10 rounded-md overflow-hidden bg-[#111] border border-[#1a1a1a] relative">
                {project.coverUrl ? (
                  <Image src={project.coverUrl} alt="" fill sizes="64px" className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <IconFolderCode size={14} className="text-gray-700" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium text-white truncate">{project.title}</span>
                  {!project.published && (
                    <span className="shrink-0 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#1a1a1a] text-gray-500 border border-[#262626]">
                      Borrador
                    </span>
                  )}
                </div>
                {project.description && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">{project.description}</p>
                )}
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <Link
                  href={`/admin/projects/${project.id}`}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-[#1a1a1a] px-2.5 py-1.5 text-xs text-gray-300 hover:text-white hover:border-[#22d3ee]/50 transition-colors"
                >
                  <IconPencil size={13} />
                  Editar
                </Link>
                <DeleteButton id={project.id} title={project.title} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
