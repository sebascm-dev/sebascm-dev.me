'use server'

import { updateTag } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { GITHUB_CACHE_TAG } from '@/lib/github/client'

/**
 * Drops the cached GitHub data so the next render fetches fresh numbers.
 * updateTag (not revalidateTag) gives read-your-own-writes: the refresh
 * shows new data immediately instead of serving stale content first.
 */
export async function refreshGithub(): Promise<void> {
  await requireAdmin()
  updateTag(GITHUB_CACHE_TAG)
}
