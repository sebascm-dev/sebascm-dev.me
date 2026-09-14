// Admin shell layout — Server Component with defense-in-depth auth check
import Image from 'next/image'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { logout } from '@/app/actions/auth'
import { about } from '@/data/about'
import { getProfile } from '@/app/actions/profile'
import { IconLogout } from '@tabler/icons-react'
import { AdminNav } from '@/components/admin/AdminNav'
import { Breadcrumb } from '@/components/admin/Breadcrumb'
import { Fira_Code, Fira_Sans } from 'next/font/google'

const firaCode = Fira_Code({
  subsets: ['latin'],
  variable: '--font-fira-code',
  display: 'swap',
})

const firaSans = Fira_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-fira-sans',
  display: 'swap',
})

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdmin()

  const profileData = await getProfile()
  const avatarSrc = profileData?.avatarUrl ?? about.photo

  return (
    <div className={`min-h-screen bg-[#0a0a0a] text-white flex ${firaCode.variable} ${firaSans.variable} font-[var(--font-fira-sans)]`}>

      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col border-r border-[#1a1a1a] bg-[#0d0d0d] sticky top-0 h-screen">

        {/* User profile — click to go to profile settings */}
        <Link
          href="/admin/profile"
          className="px-4 py-4 border-b border-[#1a1a1a] flex items-center gap-3 hover:bg-[#1a1a1a] transition-colors"
        >
          <Image
            src={avatarSrc}
            alt={about.name}
            width={36}
            height={36}
            className="rounded-full object-cover w-9 h-9"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">Sebastián</p>
            <p className="text-xs text-gray-500 truncate">{about.email}</p>
          </div>
        </Link>

        <AdminNav />

        {/* Logout — pinned to bottom */}
        <div className="px-3 py-4 border-t border-[#1a1a1a]">
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#1a1a1a] transition-colors cursor-pointer"
            >
              <IconLogout size={16} />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">
        <div className="w-full">
          <Breadcrumb />
          {children}
        </div>
      </main>
    </div>
  )
}
