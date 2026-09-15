import { Suspense } from 'react'
import { FEED_LIMIT, summarizeActivity } from '@/lib/github/activity'
import { formatNumber, plural } from '@/lib/github/format'
import { getActivityData } from '@/lib/github/queries'
import { madridDate } from '@/lib/github/range'
import { settle } from '@/lib/github/settle'
import type { PullRequestCounts, RangeKey } from '@/lib/github/types'
import { ActivityCalendar } from './ActivityCalendar'
import { ActivityFeed } from './ActivityFeed'
import { ActivityHero } from './ActivityHero'
import { EmptyActivity } from './EmptyActivity'
import { LanguagesPanel } from './LanguagesPanel'
import { RepoBreakdown } from './RepoBreakdown'
import { SectionError } from './SectionError'
import { LanguagesSkeleton } from './Skeletons'
import { StatTile } from './StatTile'
import { WeekdayChart } from './WeekdayChart'

/** "2 fusionadas · 1 abierta"; the open part only appears when there is one */
function pullRequestCaption({ merged, open }: PullRequestCounts) {
  const mergedText = `${formatNumber(merged)} ${merged === 1 ? 'fusionada' : 'fusionadas'}`
  return open > 0 ? `${mergedText} · ${formatNumber(open)} ${open === 1 ? 'abierta' : 'abiertas'}` : mergedText
}

/** Hero, calendar, feed and detail: everything derived from one commit list */
export async function ActivitySection({ range }: { range: RangeKey }) {
  const result = await settle(getActivityData(range))

  if (!result.ok) {
    console.error('[admin/github] activity failed to load', result.error)
    return <SectionError title="Actividad" error={result.error} />
  }

  const { data, windows } = result.value
  const summary = summarizeActivity(data, windows)
  const nowIso = new Date().toISOString()
  const lastCommitDate = summary.lastPreviousCommitAt ? madridDate(new Date(summary.lastPreviousCommitAt)) : null
  const activeShare = Math.round((summary.activeDays / summary.windowDays) * 100)

  return (
    <div className="space-y-6">
      {/* grid-cols-* use minmax(0, 1fr), so long content can never widen the page.
          Phone: hero + 2×2 tiles · tablet: hero + 4 tiles · desktop: one row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
        <ActivityHero
          total={summary.total}
          previousTotal={summary.previousTotal}
          delta={summary.delta}
          sparkline={summary.sparkline}
          range={range}
        />
        <StatTile
          label="Racha actual"
          value={plural(summary.currentStreak, 'día', 'días')}
          caption={`Mejor: ${plural(summary.bestStreak, 'día', 'días')}`}
        />
        <StatTile
          label="Días activos"
          value={
            <>
              {formatNumber(summary.activeDays)}{' '}
              <span className="text-sm font-normal text-gray-400">de {formatNumber(summary.windowDays)}</span>
            </>
          }
          caption={`${activeShare}% del periodo`}
        />
        <StatTile
          label="Repos con commits"
          value={formatNumber(summary.reposWithCommits)}
          caption={`de ${plural(summary.totalRepos, 'repo', 'repos')}`}
        />
        <StatTile
          label="Pull requests"
          value={formatNumber(summary.pullRequests.opened)}
          caption={pullRequestCaption(summary.pullRequests)}
        />
      </div>

      <ActivityCalendar days={summary.days} range={range} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section
          aria-labelledby="activity-feed-title"
          className="min-w-0 rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] p-5"
        >
          <h2 id="activity-feed-title" className="mb-2 text-sm font-medium text-gray-200">
            Actividad reciente
          </h2>
          {summary.feed.length === 0 ? (
            <EmptyActivity range={range} lastCommitDate={lastCommitDate} />
          ) : (
            <ActivityFeed items={summary.feed} nowIso={nowIso} limitReached={summary.feed.length === FEED_LIMIT} />
          )}
        </section>

        <div className="min-w-0 space-y-6">
          <RepoBreakdown perRepo={summary.perRepo} range={range} />
          <WeekdayChart weekdays={summary.weekdays} />
          <Suspense fallback={<LanguagesSkeleton />}>
            <LanguagesPanel />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
