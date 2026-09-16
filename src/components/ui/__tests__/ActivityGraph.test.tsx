import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CustomTooltip } from '../ActivityGraph'
import type { ScaledHeroPoint } from '@/lib/github/hero'

const week = (overrides: Partial<ScaledHeroPoint> = {}): ScaledHeroPoint => ({
  start: '2026-03-19',
  end: '2026-03-25',
  commits: 12,
  privateCommits: 0,
  repos: [],
  newRepos: [],
  level: 1,
  ...overrides,
})

const renderTooltip = (point: ScaledHeroPoint, active = true) =>
  render(<CustomTooltip active={active} payload={[{ payload: point }]} maxCommits={50} />)

describe('CustomTooltip', () => {
  it('renders nothing when inactive or for an idle week', () => {
    const { container, rerender } = renderTooltip(week(), false)
    expect(container).toBeEmptyDOMElement()

    rerender(<CustomTooltip active payload={[{ payload: week({ commits: 0 }) }]} maxCommits={50} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the week range and the total commits', () => {
    renderTooltip(week())

    expect(screen.getByText(/19 mar.* – 25 mar.* 2026/i)).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('commits')).toBeInTheDocument()
  })

  it('uses the singular for a single commit', () => {
    renderTooltip(week({ commits: 1, repos: [{ name: 'web', commits: 1 }] }))

    expect(screen.getByText('commit')).toBeInTheDocument()
  })

  it('lists at most four public repos and collapses the rest', () => {
    renderTooltip(
      week({
        repos: ['a', 'b', 'c', 'd', 'e', 'f'].map((name, index) => ({ name, commits: 6 - index })),
      })
    )

    for (const name of ['a', 'b', 'c', 'd']) expect(screen.getByText(name)).toBeInTheDocument()
    expect(screen.queryByText('e')).not.toBeInTheDocument()
    expect(screen.getByText('+2 repos más')).toBeInTheDocument()
  })

  it('shows private work only as a count', () => {
    renderTooltip(week({ commits: 7, privateCommits: 5, repos: [{ name: 'web', commits: 2 }] }))

    expect(screen.getByText('Repos privados')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('hides the private row when there is no private work', () => {
    renderTooltip(week({ repos: [{ name: 'web', commits: 12 }] }))

    expect(screen.queryByText('Repos privados')).not.toBeInTheDocument()
  })

  it('marks repos created during the week', () => {
    renderTooltip(
      week({
        repos: [
          { name: 'new-app', commits: 8 },
          { name: 'old-app', commits: 4 },
        ],
        newRepos: ['new-app'],
      })
    )

    expect(screen.getAllByLabelText('Repositorio nuevo')).toHaveLength(1)
  })
})
