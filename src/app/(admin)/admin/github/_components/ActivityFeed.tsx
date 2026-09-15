'use client'

import { useState, type ReactNode } from 'react'
import {
  IconBook2,
  IconGitCommit,
  IconGitMerge,
  IconGitPullRequest,
  IconGitPullRequestClosed,
  IconGitPullRequestDraft,
  IconTag,
} from '@tabler/icons-react'
import { formatRelative } from '@/lib/github/format'
import type { FeedItem, PullRequest } from '@/lib/github/types'
import { PrivateMark } from './PrivateMark'

const PAGE_SIZE = 10

interface ActivityFeedProps {
  items: FeedItem[]
  /** Server render time, so relative times match between server and client */
  nowIso: string
  /** True when the feed was capped, so the count is not read as the total number of events */
  limitReached?: boolean
}

function pullRequestPresentation(pullRequest: PullRequest) {
  if (pullRequest.state === 'MERGED') return { Icon: IconGitMerge, label: 'Fusionada' }
  if (pullRequest.state === 'CLOSED') return { Icon: IconGitPullRequestClosed, label: 'Cerrada' }
  if (pullRequest.isDraft) return { Icon: IconGitPullRequestDraft, label: 'Borrador' }
  return { Icon: IconGitPullRequest, label: 'Abierta' }
}

function Separator() {
  return <span aria-hidden="true">·</span>
}

function Row({
  href,
  icon,
  title,
  meta,
  titleAttribute,
}: {
  href: string
  icon: ReactNode
  title: ReactNode
  meta: ReactNode
  titleAttribute?: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="-mx-2 flex gap-3 rounded-lg px-2 py-2.5 transition-colors duration-150 hover:bg-[#141414] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
    >
      <span className="mt-0.5 shrink-0 text-gray-400">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-white" title={titleAttribute}>
          {title}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-gray-400">{meta}</span>
      </span>
    </a>
  )
}

function FeedRow({ item, now }: { item: FeedItem; now: Date }) {
  const time = (
    <time dateTime={item.date} suppressHydrationWarning>
      {formatRelative(item.date, now)}
    </time>
  )

  switch (item.kind) {
    case 'commit': {
      const { commit } = item
      return (
        <Row
          href={commit.url}
          icon={<IconGitCommit size={18} aria-hidden="true" />}
          titleAttribute={commit.message}
          title={<span className="font-[var(--font-fira-code)]">{commit.message}</span>}
          meta={
            <>
              {commit.isPrivate && <PrivateMark />}
              <span translate="no">{commit.repo}</span>
              <Separator />
              <span translate="no">{commit.branch}</span>
              <Separator />
              <span className="font-[var(--font-fira-code)]">{commit.oid.slice(0, 7)}</span>
              <Separator />
              {time}
              <Separator />
              <span className="text-emerald-400">+{commit.additions}</span>
              <span className="text-red-400">−{commit.deletions}</span>
            </>
          }
        />
      )
    }

    case 'pull-request': {
      const { pullRequest } = item
      const { Icon, label } = pullRequestPresentation(pullRequest)
      return (
        <Row
          href={pullRequest.url}
          icon={<Icon size={18} aria-hidden="true" />}
          titleAttribute={pullRequest.title}
          title={
            <>
              <span className="font-[var(--font-fira-code)]">
                #{pullRequest.number} {pullRequest.title}
              </span>{' '}
              <span className="ml-1 rounded-full border border-[#2a2a2a] px-2 py-px text-[11px] text-gray-200">
                {label}
              </span>
            </>
          }
          meta={
            <>
              {pullRequest.isPrivate && <PrivateMark />}
              <span translate="no">{pullRequest.repo}</span>
              <Separator />
              {time}
            </>
          }
        />
      )
    }

    case 'release': {
      const { release } = item
      return (
        <Row
          href={release.url}
          icon={<IconTag size={18} aria-hidden="true" />}
          title={`Release ${release.name || release.tagName}`}
          meta={
            <>
              {release.isPrivate && <PrivateMark />}
              <span translate="no">{release.repo}</span>
              <Separator />
              {time}
            </>
          }
        />
      )
    }

    case 'repo-created': {
      const { repo } = item
      return (
        <Row
          href={repo.url}
          icon={<IconBook2 size={18} aria-hidden="true" />}
          title={
            <>
              Repositorio creado <Separator />{' '}
              <span className="font-[var(--font-fira-code)]" translate="no">{repo.repo}</span>
            </>
          }
          meta={
            <>
              {repo.isPrivate && <PrivateMark />}
              {time}
            </>
          }
        />
      )
    }
  }
}

export function ActivityFeed({ items, nowIso, limitReached = false }: ActivityFeedProps) {
  const [visible, setVisible] = useState(PAGE_SIZE)
  const now = new Date(nowIso)
  const shown = items.slice(0, visible)

  return (
    <div>
      <ul className="divide-y divide-[#1a1a1a]">
        {shown.map((item) => (
          <li key={item.id}>
            <FeedRow item={item} now={now} />
          </li>
        ))}
      </ul>

      {items.length > PAGE_SIZE && (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#1a1a1a] pt-3">
          <p className="text-xs text-gray-400" aria-live="polite">
            {limitReached
              ? `Mostrando ${shown.length} de los ${items.length} más recientes`
              : `Mostrando ${shown.length} de ${items.length}`}
          </p>
          {visible < items.length && (
            <button
              type="button"
              onClick={() => setVisible((count) => count + PAGE_SIZE)}
              className="cursor-pointer rounded-lg border border-[#262626] px-3 py-1.5 text-xs text-gray-200 transition-colors duration-150 hover:border-[#22d3ee]/50 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
            >
              Ver más
            </button>
          )}
        </div>
      )}
    </div>
  )
}
