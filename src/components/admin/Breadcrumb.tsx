'use client'

import { usePathname } from 'next/navigation'

const labels: Record<string, string> = {
  '/admin': 'dashboard',
  '/admin/github': 'github',
  '/admin/repos': 'repos',
  '/admin/profile': 'perfil',
  '/admin/mockups': 'mockups',
}

export function Breadcrumb() {
  const pathname = usePathname()
  const label = labels[pathname] ?? pathname.split('/').pop() ?? 'admin'

  return (
    <p className="font-mono text-sm text-gray-400 mb-6">
      sebascm.dev / <span className="text-[#22d3ee]">{label}</span>
    </p>
  )
}
