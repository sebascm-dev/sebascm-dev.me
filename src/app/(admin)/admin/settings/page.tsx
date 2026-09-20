import { requireAdmin } from '@/lib/auth'
import { getSettings } from '@/app/actions/settings'
import { SettingsForm } from './_components/SettingsForm'

export default async function SettingsPage() {
  await requireAdmin()

  const settingsData = await getSettings()

  return (
    <div className="max-w-xl">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest font-[var(--font-fira-code)] mb-4">
        Ajustes
      </p>
      <SettingsForm initialData={settingsData} />
    </div>
  )
}
