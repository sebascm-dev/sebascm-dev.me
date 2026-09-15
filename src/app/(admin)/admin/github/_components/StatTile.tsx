import type { ReactNode } from 'react'

interface StatTileProps {
  label: string
  value: ReactNode
  caption?: string
  className?: string
}

export function StatTile({ label, value, caption, className = '' }: StatTileProps) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] p-5 ${className}`}>
      <h2 className="text-xs text-gray-400">{label}</h2>
      <p className="text-2xl font-semibold leading-tight text-white">{value}</p>
      {caption && <p className="text-xs text-gray-400">{caption}</p>}
    </div>
  )
}
