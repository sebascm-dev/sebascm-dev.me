import { requireAdmin } from '@/lib/auth'
import { MockupEditor } from './_components/MockupEditor'

export default async function MockupsPage() {
  await requireAdmin()

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest font-[var(--font-fira-code)] mb-4">
        Mockups
      </p>
      <MockupEditor />
    </div>
  )
}
