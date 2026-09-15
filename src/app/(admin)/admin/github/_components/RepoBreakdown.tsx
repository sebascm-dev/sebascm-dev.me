import { formatNumber, RANGE_LABELS } from '@/lib/github/format'
import type { RangeKey, RepoCount } from '@/lib/github/types'
import { PrivateMark } from './PrivateMark'

interface RepoBreakdownProps {
  perRepo: RepoCount[]
  range: RangeKey
}

/** Thin single-color bars with the value written on every row (no hover needed) */
export function RepoBreakdown({ perRepo, range }: RepoBreakdownProps) {
  const max = perRepo[0]?.count ?? 0

  return (
    <section aria-labelledby="repo-breakdown-title" className="rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] p-5">
      <h2 id="repo-breakdown-title" className="mb-3 text-xs text-gray-400">
        Commits por repo
      </h2>

      {perRepo.length === 0 ? (
        <p className="text-sm text-gray-400">Sin commits en los {RANGE_LABELS[range]}</p>
      ) : (
        <ul className="space-y-3">
          {perRepo.map((entry) => (
            <li key={entry.repo}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-1.5">
                  {entry.isPrivate && <PrivateMark />}
                  <span className="truncate font-[var(--font-fira-code)] text-gray-200" translate="no" title={entry.repo}>
                    {entry.repo}
                  </span>
                </span>
                <span className="shrink-0 text-white [font-variant-numeric:tabular-nums]">{formatNumber(entry.count)}</span>
              </div>
              <div className="h-2 rounded-r-[4px] bg-[#161616]" aria-hidden="true">
                <div
                  className="h-2 rounded-r-[4px] bg-[#22d3ee]"
                  style={{ width: `${Math.max(2, (entry.count / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
