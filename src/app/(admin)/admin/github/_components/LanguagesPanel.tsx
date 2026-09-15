import { getReposData } from '@/lib/github/queries'
import { settle } from '@/lib/github/settle'
import { LanguageBar } from './LanguageBar'
import { SectionError } from './SectionError'

/** Languages load independently: if they fail, the rest of the activity section still works */
export async function LanguagesPanel() {
  const result = await settle(getReposData())

  if (!result.ok) {
    console.error('[admin/github] languages failed to load', result.error)
    return <SectionError title="Lenguajes" error={result.error} />
  }

  return <LanguageBar languages={result.value.languages} />
}
