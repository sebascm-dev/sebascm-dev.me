import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { RepoTable } from '../RepoTable'
import type { RepoSummary } from '@/lib/github/types'

const NOW = '2026-09-15T10:00:00Z'

const repos: RepoSummary[] = [
  { name: 'sebascm-dev.me', description: 'Portfolio personal', url: 'https://github.com/sebascm-dev/sebascm-dev.me', isPrivate: false, primaryLanguage: 'TypeScript', stars: 1, forks: 0, openIssues: 0, pushedAt: '2026-09-15T08:00:00Z', totalCommits: 56 },
  { name: 'celiamunozfisio.com', description: null, url: 'https://github.com/sebascm-dev/celiamunozfisio.com', isPrivate: true, primaryLanguage: 'TypeScript', stars: 1, forks: 0, openIssues: 0, pushedAt: '2026-09-13T10:00:00Z', totalCommits: 130 },
  { name: 'sebascm-dev', description: null, url: 'https://github.com/sebascm-dev/sebascm-dev', isPrivate: false, primaryLanguage: null, stars: 3, forks: 0, openIssues: 2, pushedAt: null, totalCommits: 1 },
]

function repoNames() {
  return screen
    .getAllByRole('row')
    .slice(1)
    // The first link is the repository name; rows with open issues also link to them
    .map((row) => within(row).getAllByRole('link')[0].textContent)
}

describe('RepoTable', () => {
  it('sorts by commits in the range by default, breaking ties by total commits', () => {
    render(<RepoTable repos={repos} rangeCounts={{ 'sebascm-dev.me': 15 }} nowIso={NOW} />)

    expect(repoNames()).toEqual(['sebascm-dev.me', 'celiamunozfisio.com', 'sebascm-dev'])
    expect(screen.getByRole('columnheader', { name: /commits \(rango\)/i })).toHaveAttribute('aria-sort', 'descending')
  })

  it('sorts with buttons and exposes the direction with aria-sort', async () => {
    const user = userEvent.setup()
    render(<RepoTable repos={repos} rangeCounts={{}} nowIso={NOW} />)

    await user.click(screen.getByRole('button', { name: /repositorio/i }))
    expect(repoNames()).toEqual(['celiamunozfisio.com', 'sebascm-dev', 'sebascm-dev.me'])
    expect(screen.getByRole('columnheader', { name: /repositorio/i })).toHaveAttribute('aria-sort', 'ascending')
    expect(screen.getByRole('columnheader', { name: /commits \(rango\)/i })).toHaveAttribute('aria-sort', 'none')

    await user.click(screen.getByRole('button', { name: /repositorio/i }))
    expect(repoNames()).toEqual(['sebascm-dev.me', 'sebascm-dev', 'celiamunozfisio.com'])
    expect(screen.getByRole('columnheader', { name: /repositorio/i })).toHaveAttribute('aria-sort', 'descending')

    await user.click(screen.getByRole('button', { name: /estrellas/i }))
    expect(repoNames()[0]).toBe('sebascm-dev')
  })

  it('shows a dash for zero issues and the number when there are open issues', () => {
    render(<RepoTable repos={repos} rangeCounts={{}} nowIso={NOW} />)

    const row = (name: string) => screen.getByRole('link', { name }).closest('tr') as HTMLElement
    expect(within(row('sebascm-dev')).getByTestId('issues')).toHaveTextContent('2')
    expect(within(row('sebascm-dev.me')).getByTestId('issues')).toHaveTextContent('—')
  })

  it('marks private repositories, shows descriptions and relative push times', () => {
    render(<RepoTable repos={repos} rangeCounts={{}} nowIso={NOW} />)

    const privateRow = screen.getByRole('link', { name: 'celiamunozfisio.com' }).closest('tr') as HTMLElement
    expect(within(privateRow).getByLabelText('Repositorio privado')).toBeInTheDocument()
    expect(screen.getByText('Portfolio personal')).toBeInTheDocument()
    // Intl writes "anteayer" for two days ago in Spanish
    expect(within(privateRow).getByText('anteayer')).toBeInTheDocument()
  })

  it('shows dashes in the range column when the activity data is unavailable', () => {
    render(<RepoTable repos={repos} rangeCounts={null} nowIso={NOW} />)

    const cells = screen.getAllByTestId('range-commits')
    expect(cells.map((cell) => cell.textContent)).toEqual(['—', '—', '—'])
  })
})
