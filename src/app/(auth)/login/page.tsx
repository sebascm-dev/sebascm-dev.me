// Server component — metadata + renders LoginForm
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAdminUser } from '@/lib/auth'
import LoginForm from './LoginForm'

// Keep this page off search engines — the admin panel is a secret easter egg
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default async function LoginPage() {
  // Send the signed-in admin straight to the panel. Only the admin: redirecting
  // any session would loop, because /admin sends non-admins back here.
  const admin = await getAdminUser()
  if (admin) redirect('/admin')

  return <LoginForm />
}
