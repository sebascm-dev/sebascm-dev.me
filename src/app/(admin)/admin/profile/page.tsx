import { requireAdmin } from '@/lib/auth'
import { getProfile } from '@/app/actions/profile'
import { ProfileLayout } from './_components/ProfileLayout'

export default async function ProfilePage() {
  await requireAdmin()

  const profileData = await getProfile()

  return (
    <ProfileLayout
      initialData={profileData}
      cvUrl={profileData?.cvUrl ?? null}
    />
  )
}
