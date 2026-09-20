'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { profile } from '@/lib/schema'
import { uploadFile, deleteFile } from '@/lib/r2'
import { getAdminUser } from '@/lib/auth'

export type ProfileActionResult = {
  success: boolean
  error?: string
}

export async function getProfile() {
  const rows = await db.select().from(profile).limit(1)
  return rows[0] ?? null
}

export async function updateProfile(_prevState: ProfileActionResult, formData: FormData): Promise<ProfileActionResult> {
  const admin = await getAdminUser()
  if (!admin) return { success: false, error: 'No autorizado.' }

  try {
    const existing = await getProfile()

    // --- Avatar ---
    let avatarUrl = (formData.get('existingAvatarUrl') as string) || null
    let avatarKey = (formData.get('existingAvatarKey') as string) || null
    const avatarFile = formData.get('avatar') as File | null

    if (avatarFile && avatarFile.size > 0) {
      // Borrar el anterior antes de subir el nuevo
      if (existing?.avatarKey) {
        await deleteFile(existing.avatarKey)
      }
      const buffer = Buffer.from(await avatarFile.arrayBuffer())
      const key = `avatars/${Date.now()}-${avatarFile.name}`
      const uploaded = await uploadFile(buffer, key, avatarFile.type)
      avatarUrl = uploaded.url
      avatarKey = uploaded.key
    }

    // --- CV ---
    let cvUrl = (formData.get('existingCvUrl') as string) || null
    let cvKey = (formData.get('existingCvKey') as string) || null
    const cvFile = formData.get('cv') as File | null

    if (cvFile && cvFile.size > 0) {
      if (existing?.cvKey) {
        await deleteFile(existing.cvKey)
      }
      const buffer = Buffer.from(await cvFile.arrayBuffer())
      const key = `cv/${Date.now()}-${cvFile.name}`
      const uploaded = await uploadFile(buffer, key, cvFile.type)
      cvUrl = uploaded.url
      cvKey = uploaded.key
    }

    const values = {
      firstName: (formData.get('firstName') as string) || null,
      lastName1: (formData.get('lastName1') as string) || null,
      lastName2: (formData.get('lastName2') as string) || null,
      birthDate: (formData.get('birthDate') as string) || null,
      dni: (formData.get('dni') as string) || null,
      email: (formData.get('email') as string) || null,
      phone: (formData.get('phone') as string) || null,
      location: (formData.get('location') as string) || null,
      province: (formData.get('province') as string) || null,
      zip: (formData.get('zip') as string) || null,
      community: (formData.get('community') as string) || null,
      country: (formData.get('country') as string) || null,
      jobTitle: (formData.get('jobTitle') as string) || null,
      experience: formData.get('experience') ? Number(formData.get('experience')) : null,
      degree: (formData.get('degree') as string) || null,
      bio: (formData.get('bio') as string) || null,
      available: formData.get('available') === 'true',
      github: (formData.get('github') as string) || null,
      linkedin: (formData.get('linkedin') as string) || null,
      twitter: (formData.get('twitter') as string) || null,
      instagram: (formData.get('instagram') as string) || null,
      youtube: (formData.get('youtube') as string) || null,
      website: (formData.get('website') as string) || null,
      avatarUrl,
      avatarKey,
      cvUrl,
      cvKey,
      updatedAt: new Date(),
    }

    if (existing) {
      await db.update(profile).set(values).where(eq(profile.id, existing.id))
    } else {
      await db.insert(profile).values(values)
    }

    revalidatePath('/admin/profile')
    return { success: true }
  } catch (err) {
    console.error('[updateProfile error]', err)
    return { success: false, error: 'Error al guardar el perfil.' }
  }
}
