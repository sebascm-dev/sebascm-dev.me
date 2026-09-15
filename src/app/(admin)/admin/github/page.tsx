import { Suspense } from 'react'
import { requireAdmin } from '@/lib/auth'
import { parseRange } from '@/lib/github/range'
import { ActivitySection } from './_components/ActivitySection'
import { RangeFilter } from './_components/RangeFilter'
import { PendingContent, RangeTransitionProvider } from './_components/RangeTransition'
import { ReposSection } from './_components/ReposSection'
import { ActivitySkeleton, ReposSkeleton, SyncStatusSkeleton } from './_components/Skeletons'
import { SyncStatus } from './_components/SyncStatus'

interface GithubPageProps {
  searchParams: Promise<{ range?: string | string[] }>
}

export default async function GithubPage({ searchParams }: GithubPageProps) {
  await requireAdmin()
  const range = parseRange((await searchParams).range)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white font-[var(--font-fira-code)]">GitHub</h1>
        <p className="mt-1 text-sm text-gray-400">Tu constancia y actividad en todos tus repositorios</p>
      </header>

      <RangeTransitionProvider>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <RangeFilter value={range} />
          <Suspense fallback={<SyncStatusSkeleton />}>
            <SyncStatus range={range} />
          </Suspense>
        </div>

        <PendingContent>
          <div className="space-y-10 pt-6">
            <Suspense fallback={<ActivitySkeleton />}>
              <ActivitySection range={range} />
            </Suspense>
            <Suspense fallback={<ReposSkeleton />}>
              <ReposSection range={range} />
            </Suspense>
          </div>
        </PendingContent>
      </RangeTransitionProvider>
    </div>
  )
}
