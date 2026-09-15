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
    <div>
      {/* The sidebar already says where you are; the heading stays for screen readers and page structure */}
      <h1 className="sr-only">GitHub</h1>

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
