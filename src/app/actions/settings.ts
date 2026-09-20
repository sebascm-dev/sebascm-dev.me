'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings } from '@/lib/schema'
import { getAdminUser } from '@/lib/auth'

export type SettingsActionResult = {
  success: boolean
  error?: string
}

export async function getSettings() {
  const rows = await db.select().from(settings).limit(1)
  return rows[0] ?? null
}

export async function updateSettings(_prevState: SettingsActionResult, formData: FormData): Promise<SettingsActionResult> {
  const admin = await getAdminUser()
  if (!admin) return { success: false, error: 'No autorizado.' }

  try {
    const existing = await getSettings()
    const values = {
      activityTooltipEnabled: formData.get('activityTooltipEnabled') === 'true',
      updatedAt: new Date(),
    }

    if (existing) {
      await db.update(settings).set(values).where(eq(settings.id, existing.id))
    } else {
      await db.insert(settings).values(values)
    }

    revalidatePath('/admin/settings')
    revalidatePath('/')
    return { success: true }
  } catch (err) {
    console.error('[updateSettings error]', err)
    return { success: false, error: 'Error al guardar los ajustes.' }
  }
}
