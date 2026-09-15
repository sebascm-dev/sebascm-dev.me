import { formatRelative } from '@/lib/github/format'
import { getActivityData } from '@/lib/github/queries'
import { settle } from '@/lib/github/settle'
import type { RangeKey } from '@/lib/github/types'
import { RefreshButton } from './RefreshButton'

/** "Actualizado hace X" + refresh; shares the deduplicated activity fetch with the sections */
export async function SyncStatus({ range }: { range: RangeKey }) {
  // When the fetch fails the activity section shows the error; here we only hide the timestamp
  const result = await settle(getActivityData(range))

  return (
    <div className="flex items-center gap-3">
      {result.ok && (
        <p className="text-xs text-gray-400">
          Actualizado <time dateTime={result.value.data.fetchedAt}>{formatRelative(result.value.data.fetchedAt)}</time>
        </p>
      )}
      <RefreshButton />
    </div>
  )
}
