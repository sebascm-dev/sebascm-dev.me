import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { ActivityFeed } from '../ActivityFeed'
import type { Commit, FeedItem, PullRequest } from '@/lib/github/types'

const NOW = '2026-09-15T10:00:00Z'

function commitItem(i: number, overrides: Partial<Commit> = {}): FeedItem {
  const commit: Commit = {
    oid: `abcdef${String(i).padStart(4, '0')}`,
    repo: 'sebascm-dev.me',
    isPrivate: false,
    branch: 'master',
    committedAt: '2026-09-15T07:00:00Z',
    message: `feat: change ${i}`,
    url: `https://github.com/sebascm-dev/sebascm-dev.me/commit/${i}`,
    additions: 5,
    deletions: 1,
    ...overrides,
  }
  return { kind: 'commit', id: `commit:${i}`, date: commit.committedAt, commit }
}

function prItem(overrides: Partial<PullRequest>, event: 'opened' | 'merged' | 'closed'): FeedItem {
  const pullRequest: PullRequest = {
    number: 2,
    title: 'feat(auth): replace NextAuth',
    url: 'https://github.com/sebascm-dev/sebascm-dev.me/pull/2',
    state: 'OPEN',
    isDraft: false,
    repo: 'sebascm-dev.me',
    isPrivate: false,
    createdAt: '2026-09-14T20:00:00Z',
    mergedAt: null,
    closedAt: null,
    ...overrides,
  }
  return { kind: 'pull-request', id: `pr:${pullRequest.number}`, date: pullRequest.createdAt, event, pullRequest }
}

describe('ActivityFeed', () => {
  it('shows ten items and loads ten more on demand', async () => {
    const user = userEvent.setup()
    const items = Array.from({ length: 25 }, (_, i) => commitItem(i))
    render(<ActivityFeed items={items} nowIso={NOW} />)

    expect(screen.getAllByRole('listitem')).toHaveLength(10)
    expect(screen.getByText('Mostrando 10 de 25')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ver más' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(20)

    await user.click(screen.getByRole('button', { name: 'Ver más' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(25)
    expect(screen.queryByRole('button', { name: 'Ver más' })).not.toBeInTheDocument()
  })

  // The feed is capped: without this, "10 de 50" reads as if only 50 events happened
  it('says the list shows the most recent events when the cap is reached', () => {
    const items = Array.from({ length: 50 }, (_, i) => commitItem(i))
    render(<ActivityFeed items={items} nowIso={NOW} limitReached />)

    expect(screen.getByText('Mostrando 10 de los 50 más recientes')).toBeInTheDocument()
  })

  it('describes a commit with repo, branch, short sha, relative time and changes', () => {
    render(<ActivityFeed items={[commitItem(1)]} nowIso={NOW} />)

    const link = screen.getByRole('link', { name: /feat: change 1/ })
    expect(link).toHaveAttribute('href', 'https://github.com/sebascm-dev/sebascm-dev.me/commit/1')
    expect(link).toHaveTextContent('sebascm-dev.me')
    expect(link).toHaveTextContent('master')
    expect(link).toHaveTextContent('abcdef0')
    expect(link).toHaveTextContent('hace 3 horas')
    expect(link).toHaveTextContent('+5')
    expect(link).toHaveTextContent('−1')
  })

  it('marks private repositories without relying on color', () => {
    render(<ActivityFeed items={[commitItem(1, { isPrivate: true, repo: 'celiamunozfisio.com' })]} nowIso={NOW} />)

    expect(screen.getByLabelText('Repositorio privado')).toBeInTheDocument()
  })

  it('writes the state of every pull request', () => {
    render(
      <ActivityFeed
        nowIso={NOW}
        items={[
          prItem({ number: 1, state: 'MERGED', mergedAt: '2026-09-14T23:00:00Z' }, 'merged'),
          prItem({ number: 2, state: 'OPEN' }, 'opened'),
          prItem({ number: 3, state: 'OPEN', isDraft: true }, 'opened'),
          prItem({ number: 4, state: 'CLOSED', closedAt: '2026-09-14T21:00:00Z' }, 'closed'),
        ]}
      />
    )

    expect(screen.getByText('Fusionada')).toBeInTheDocument()
    expect(screen.getByText('Abierta')).toBeInTheDocument()
    expect(screen.getByText('Borrador')).toBeInTheDocument()
    expect(screen.getByText('Cerrada')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /#1 feat\(auth\): replace NextAuth/ })).toBeInTheDocument()
  })

  it('describes releases and new repositories', () => {
    render(
      <ActivityFeed
        nowIso={NOW}
        items={[
          { kind: 'release', id: 'r', date: '2026-09-14T10:00:00Z', release: { repo: 'alpha', isPrivate: false, name: '', tagName: 'v1.0.0', url: 'https://github.com/r', publishedAt: '2026-09-14T10:00:00Z' } },
          { kind: 'repo-created', id: 'c', date: '2026-09-13T10:00:00Z', repo: { repo: 'gamma', isPrivate: false, url: 'https://github.com/g', createdAt: '2026-09-13T10:00:00Z' } },
        ]}
      />
    )

    expect(screen.getByRole('link', { name: /Release v1\.0\.0/ })).toHaveAttribute('href', 'https://github.com/r')
    expect(screen.getByRole('link', { name: /Repositorio creado/ })).toHaveTextContent('gamma')
  })
})
