'use client'

import { useState } from 'react'
import { IconChevronDown, IconChevronUp, IconSelector } from '@tabler/icons-react'
import { formatNumber, formatRelative } from '@/lib/github/format'
import type { RepoSummary } from '@/lib/github/types'
import { PrivateMark } from './PrivateMark'

type SortKey = 'name' | 'rangeCommits' | 'totalCommits' | 'pushedAt' | 'openIssues' | 'stars'
type SortDirection = 'asc' | 'desc'

interface RepoTableProps {
  repos: RepoSummary[]
  /** Commits per repository in the selected range; null when activity data failed to load */
  rangeCounts: Record<string, number> | null
  /** Server render time, so relative times match between server and client */
  nowIso: string
}

const COLUMNS: { key: SortKey | null; label: string; align: 'left' | 'right' }[] = [
  { key: 'name', label: 'Repositorio', align: 'left' },
  { key: null, label: 'Lenguaje', align: 'left' },
  { key: 'rangeCommits', label: 'Commits (rango)', align: 'right' },
  { key: 'totalCommits', label: 'Total', align: 'right' },
  { key: 'pushedAt', label: 'Último push', align: 'right' },
  { key: 'openIssues', label: 'Issues', align: 'right' },
  { key: 'stars', label: 'Estrellas', align: 'right' },
]

function sortValue(repo: RepoSummary, key: SortKey, rangeCounts: RepoTableProps['rangeCounts']): string | number {
  switch (key) {
    case 'name':
      return repo.name.toLowerCase()
    case 'rangeCommits':
      return rangeCounts?.[repo.name] ?? 0
    case 'totalCommits':
      return repo.totalCommits
    case 'pushedAt':
      return repo.pushedAt ? Date.parse(repo.pushedAt) : 0
    case 'openIssues':
      return repo.openIssues
    case 'stars':
      return repo.stars
  }
}

export function RepoTable({ repos, rangeCounts, nowIso }: RepoTableProps) {
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'rangeCommits',
    direction: 'desc',
  })
  const now = new Date(nowIso)

  function handleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'name' ? 'asc' : 'desc' }
    )
  }

  const sorted = [...repos].sort((a, b) => {
    const left = sortValue(a, sort.key, rangeCounts)
    const right = sortValue(b, sort.key, rangeCounts)
    const primary =
      typeof left === 'string' ? left.localeCompare(right as string) : left - (right as number)
    if (primary !== 0) return sort.direction === 'asc' ? primary : -primary
    // Stable, meaningful tie-break: busier repositories first, then by name
    return b.totalCommits - a.totalCommits || a.name.localeCompare(b.name)
  })

  return (
    <div className="overflow-hidden rounded-xl border border-[#1a1a1a] bg-[#0d0d0d]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm [font-variant-numeric:tabular-nums]">
          <caption className="sr-only">Repositorios</caption>
          <thead>
            <tr className="border-b border-[#1f1f1f] text-xs text-gray-400">
              {COLUMNS.map(({ key, label, align }) => {
                const active = key !== null && sort.key === key
                const ariaSort = !key ? undefined : active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'
                return (
                  <th
                    key={label}
                    scope="col"
                    aria-sort={ariaSort}
                    className={`px-4 py-3 font-medium ${align === 'right' ? 'text-right' : 'text-left'}`}
                  >
                    {key ? (
                      <button
                        type="button"
                        onClick={() => handleSort(key)}
                        className={`inline-flex cursor-pointer items-center gap-1 rounded transition-colors duration-150 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${active ? 'text-[#22d3ee]' : ''}`}
                      >
                        {label}
                        {active ? (
                          sort.direction === 'asc' ? <IconChevronUp size={12} aria-hidden="true" /> : <IconChevronDown size={12} aria-hidden="true" />
                        ) : (
                          <IconSelector size={12} aria-hidden="true" />
                        )}
                      </button>
                    ) : (
                      label
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-10 text-center text-gray-400">
                  No hay repositorios
                </td>
              </tr>
            ) : (
              sorted.map((repo) => (
                <tr key={repo.name} className="border-b border-[#161616] transition-colors duration-150 last:border-0 hover:bg-[#121212]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {repo.isPrivate && <PrivateMark />}
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        translate="no"
                        className="rounded font-[var(--font-fira-code)] font-medium text-white transition-colors duration-150 hover:text-[#22d3ee] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                      >
                        {repo.name}
                      </a>
                    </div>
                    {repo.description && (
                      <p className="mt-0.5 max-w-xs truncate text-xs text-gray-400" title={repo.description}>
                        {repo.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{repo.primaryLanguage ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-white" data-testid="range-commits">
                    {rangeCounts === null ? '—' : formatNumber(rangeCounts[repo.name] ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400">{formatNumber(repo.totalCommits)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-gray-400" suppressHydrationWarning>
                    {repo.pushedAt ? formatRelative(repo.pushedAt, now) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right" data-testid="issues">
                    {repo.openIssues === 0 ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <a
                        href={`${repo.url}/issues`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400 transition-colors duration-150 hover:bg-amber-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                      >
                        {repo.openIssues}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400">{formatNumber(repo.stars)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
