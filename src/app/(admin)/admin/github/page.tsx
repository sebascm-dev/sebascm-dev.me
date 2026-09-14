import { Suspense } from 'react'
import { requireAdmin } from '@/lib/auth'
import { fetchReposWithStats, fetchLanguageBreakdown } from '@/lib/github.server'
import { SummaryStats } from './_components/SummaryStats'
import { ContributionsChart } from './_components/ContributionsChart'
import { TopReposCard } from './_components/TopReposCard'
import { LanguageBreakdown } from './_components/LanguageBreakdown'
import { ActivityMetrics } from './_components/ActivityMetrics'
import { WeekdayChart } from './_components/WeekdayChart'
import { RepoTable } from '../repos/_components/RepoTable'
import type { ContributionDay } from '@/lib/github.types'

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export const revalidate = 300

function SectionSkeleton({ height = 180 }: { height?: number }) {
  return (
    <div
      className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl animate-pulse"
      style={{ height }}
    />
  )
}

async function fetchContributions(): Promise<ContributionDay[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/github/activity`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return []
    const data = (await res.json()) as { history?: ContributionDay[] }
    return data.history ?? []
  } catch {
    return []
  }
}

export default async function GithubPage() {
  await requireAdmin()

  const [repos, languages, contributions] = await Promise.all([
    fetchReposWithStats(),
    fetchLanguageBreakdown(),
    fetchContributions(),
  ])

  const weekdayTotals = Array(7).fill(0) as number[]
  for (const d of contributions) {
    const dow = new Date(d.date + 'T12:00:00').getDay()
    weekdayTotals[dow] += d.count
  }
  // Reordenar para que el último día sea hoy
  const todayDow = new Date().getDay()
  const weekdayData = Array.from({ length: 7 }, (_, i) => {
    const idx = (todayDow - 6 + i + 7) % 7
    return { day: DAYS[idx], commits: weekdayTotals[idx] }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white font-[var(--font-fira-code)]">GitHub</h1>
        <p className="text-sm text-gray-500 mt-1">Resumen de actividad y repositorios</p>
      </div>

      <Suspense fallback={<SectionSkeleton height={88} />}>
        <SummaryStats repos={repos} />
      </Suspense>

      <ActivityMetrics contributions={contributions} />

      <Suspense fallback={<SectionSkeleton height={260} />}>
        <ContributionsChart data={contributions} />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch lg:h-56">
        <TopReposCard repos={repos} />
        <WeekdayChart data={weekdayData} />
        <LanguageBreakdown data={languages} />
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-white font-[var(--font-fira-code)]">Repositorios</h2>
          <p className="text-xs text-gray-500 mt-0.5">{repos.length} repositorios · ordenados por commits</p>
        </div>
        <RepoTable repos={repos} />
      </div>
    </div>
  )
}
