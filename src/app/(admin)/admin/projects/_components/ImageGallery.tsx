'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { IconTrash, IconCopy } from '@tabler/icons-react'
import { deleteProjectImage } from '@/app/actions/projects'
import { toast } from '@/lib/toast'
import type { projectImages } from '@/lib/schema'
import type { InferSelectModel } from 'drizzle-orm'

type ProjectImage = InferSelectModel<typeof projectImages>

export function ImageGallery({
  images,
  projectSlug,
  showCopyUrl,
}: {
  images: ProjectImage[]
  projectSlug: string
  /** Las imágenes de contenido se referencian a mano en el markdown — copiar la URL ahorra un viaje a R2 */
  showCopyUrl?: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleDelete = (id: number) => {
    startTransition(async () => {
      const result = await deleteProjectImage(id, projectSlug)
      if (result.success) router.refresh()
      else toast.error(result.error ?? 'Error al borrar la imagen.')
    })
  }

  const handleCopy = async (url: string) => {
    await navigator.clipboard.writeText(`![](${url})`)
    toast.success('Markdown copiado.')
  }

  if (images.length === 0) {
    return <p className="text-xs text-gray-600">Sin imágenes todavía.</p>
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {images.map((image) => (
        <div key={image.id} className="group relative aspect-video rounded-lg overflow-hidden bg-[#111] border border-[#1a1a1a]">
          <Image src={image.url} alt="" fill sizes="150px" className="object-cover" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            {showCopyUrl && (
              <button
                type="button"
                onClick={() => handleCopy(image.url)}
                className="cursor-pointer p-1.5 rounded-md bg-[#1a1a1a] text-gray-300 hover:text-[#22d3ee]"
                title="Copiar markdown"
              >
                <IconCopy size={13} />
              </button>
            )}
            <button
              type="button"
              onClick={() => handleDelete(image.id)}
              disabled={isPending}
              className="cursor-pointer p-1.5 rounded-md bg-[#1a1a1a] text-gray-300 hover:text-red-400 disabled:opacity-50"
              title="Borrar"
            >
              <IconTrash size={13} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
