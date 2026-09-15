import { countPerRepo } from '@/lib/github/activity'
import { plural } from '@/lib/github/format'
import { getActivityData, getReposData } from '@/lib/github/queries'
import { settle } from '@/lib/github/settle'
import type { RangeKey } from '@/lib/github/types'
import { RepoTable } from './RepoTable'
import { SectionError } from './SectionError'

export async function ReposSection({ range }: { range: RangeKey }) {
  const [repos, activity] = await Promise.all([settle(getReposData()), settle(getActivityData(range))])

  if (!repos.ok) {
    console.error('[admin/github] repositories failed to load', repos.error)
    return <SectionError title="Repositorios" error={repos.error} />
  }

  // The table still renders when activity fails; the range column then shows dashes
  const rangeCounts = activity.ok
    ? Object.fromEntries(
        countPerRepo(activity.value.data.commits, activity.value.windows.current).map((entry) => [entry.repo, entry.count])
      )
    : null

  return (
    <section aria-labelledby="repos-title" className="space-y-3">
      <div>
        <h2 id="repos-title" className="text-base font-semibold text-white">
          Repositorios
        </h2>
        <p className="mt-0.5 text-xs text-gray-400">
          {plural(repos.value.repos.length, 'repositorio', 'repositorios')} · commits de la rama principal
        </p>
      </div>
      <RepoTable repos={repos.value.repos} rangeCounts={rangeCounts} nowIso={new Date().toISOString()} />
    </section>
  )
}
