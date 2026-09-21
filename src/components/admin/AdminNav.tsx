'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { IconLayoutDashboard, IconBrandGithub, IconFolderCode, IconDeviceImac } from '@tabler/icons-react'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: IconLayoutDashboard },
  { href: '/admin/projects', label: 'Proyectos', icon: IconFolderCode },
  { href: '/admin/mockups', label: 'Mockups', icon: IconDeviceImac },
  { href: '/admin/github', label: 'GitHub', icon: IconBrandGithub },
]

export function AdminNav() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  return (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {navItems.map((item) => {
        const active = isActive(item.href)
        const Icon = item.icon
        return (
          <div key={item.href}>
            <Link
              href={item.href}
              className={
                active
                  ? 'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-[var(--font-fira-sans)] text-white bg-[#1a1a1a] cursor-pointer'
                  : 'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-[var(--font-fira-sans)] text-gray-400 hover:text-white hover:bg-[#1a1a1a] transition-colors cursor-pointer'
              }
            >
              <Icon
                size={16}
                className={active ? 'text-[#22d3ee]' : undefined}
              />
              {item.label}
            </Link>
          </div>
        )
      })}
    </nav>
  )
}
