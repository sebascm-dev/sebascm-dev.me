import { formatPercent } from '@/lib/github/format'
import type { LanguageShare } from '@/lib/github/types'

// Emphasis form: the leading language in the accent, the rest in grays.
// Names and percentages are always written, so color never carries identity alone.
const SHADES = ['#22d3ee', '#6b7280', '#4b5563', '#374151'] as const
const VISIBLE_LANGUAGES = 3

interface LanguageBarProps {
  languages: LanguageShare[]
}

export function LanguageBar({ languages }: LanguageBarProps) {
  const visible = languages.slice(0, VISIBLE_LANGUAGES)
  const rest = languages.slice(VISIBLE_LANGUAGES)
  const segments =
    rest.length > 0
      ? [
          ...visible,
          {
            name: 'Otros',
            bytes: rest.reduce((sum, language) => sum + language.bytes, 0),
            share: rest.reduce((sum, language) => sum + language.share, 0),
          },
        ]
      : visible

  return (
    <section aria-labelledby="languages-title" className="rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 id="languages-title" className="text-xs text-gray-400">
          Lenguajes
        </h2>
        <span className="text-[11px] text-gray-400">No depende del rango</span>
      </div>

      {segments.length === 0 ? (
        <p className="text-sm text-gray-400">Sin datos de lenguajes</p>
      ) : (
        <>
          <div aria-hidden="true" className="mb-3 flex h-3 gap-[2px] overflow-hidden rounded-[4px]">
            {segments.map((segment, index) => (
              <span
                key={segment.name}
                style={{ flexGrow: segment.share, flexBasis: 0, minWidth: 2, backgroundColor: SHADES[index] }}
              />
            ))}
          </div>
          <ul className="space-y-1.5">
            {segments.map((segment, index) => (
              <li key={segment.name} className="flex items-center justify-between gap-3 text-sm">
                <span className={`flex items-center gap-2 ${index === 0 ? 'text-white' : 'text-gray-400'}`}>
                  <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: SHADES[index] }} />
                  <span translate="no">{segment.name}</span>
                </span>
                <span className={`[font-variant-numeric:tabular-nums] ${index === 0 ? 'text-white' : 'text-gray-400'}`}>
                  {formatPercent(segment.share)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
