import { fireEvent, render, renderHook, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { chartTopFor, CommitDayDot, CustomTooltip, RepoMarker, tooltipPosition, useLingeringValue } from '../ActivityGraph'
import type { ScaledHeroPoint } from '@/lib/github/hero'

const week = (overrides: Partial<ScaledHeroPoint> = {}): ScaledHeroPoint => ({
  start: '2026-03-19',
  end: '2026-03-25',
  commits: 12,
  smoothed: 12,
  repos: [],
  newRepos: [],
  level: 1,
  dayCommits: {},
  ...overrides,
})

/** YYYY-MM-DD, i days after 2026-01-01 */
const dayAfter = (i: number) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10)

const renderTooltip = (point: ScaledHeroPoint, active = true) =>
  render(<CustomTooltip active={active} payload={[{ payload: point }]} />)

describe('CustomTooltip day card', () => {
  const repo = (name: string, commits: number, isPrivate = false) => ({ name, commits, isPrivate })

  it('renders nothing when inactive or where the curve is flat', () => {
    const { container, rerender } = renderTooltip(week(), false)
    expect(container).toBeEmptyDOMElement()

    rerender(<CustomTooltip active payload={[{ payload: week({ commits: 0 }) }]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('names the exact day with its weekday, not a range', () => {
    renderTooltip(week({ end: '2026-02-16', dayCommits: { web: 3 }, repos: [repo('web', 12)] }))

    expect(screen.getByText(/lun.*16 feb.*2026/i)).toBeInTheDocument()
    expect(screen.queryByText(/–/)).not.toBeInTheDocument()
  })

  it('leads with the numbers: commits that day and in the last 30 days', () => {
    renderTooltip(week({ commits: 12, dayCommits: { web: 3, api: 1 }, repos: [repo('web', 8), repo('api', 4)] }))

    const day = screen.getByTestId('day-total')
    expect(within(day).getByText('4')).toBeInTheDocument()
    expect(day).toHaveTextContent('commits este día')
    const range = screen.getByTestId('range-total')
    expect(within(range).getByText('12')).toBeInTheDocument()
    expect(range).toHaveTextContent('últimos 30 días')
  })

  it('uses the singular for a single commit that day', () => {
    renderTooltip(week({ dayCommits: { web: 1 }, repos: [repo('web', 12)] }))

    expect(screen.getByTestId('day-total')).toHaveTextContent('commit este día')
    expect(screen.getByTestId('day-total')).not.toHaveTextContent('commits')
  })

  it('lists the repos of that day with their commits', () => {
    renderTooltip(week({ dayCommits: { web: 3, api: 1 }, repos: [repo('web', 8), repo('api', 4)] }))

    const list = screen.getByTestId('repo-list')
    expect(list).toHaveTextContent(/este día/i)
    expect(within(list).getByText('web').closest('li')).toHaveTextContent('3')
    expect(within(list).getByText('api').closest('li')).toHaveTextContent('1')
  })

  it('falls back to the repos of the last 30 days on a day without commits', () => {
    renderTooltip(week({ commits: 9, dayCommits: {}, repos: [repo('web', 7), repo('api', 2)] }))

    expect(within(screen.getByTestId('day-total')).getByText('0')).toBeInTheDocument()
    const list = screen.getByTestId('repo-list')
    expect(list).toHaveTextContent(/últimos 30 días/i)
    expect(within(list).getByText('web').closest('li')).toHaveTextContent('7')
  })

  it('lists at most four repos and collapses the rest', () => {
    const names = ['a', 'b', 'c', 'd', 'e', 'f']
    renderTooltip(
      week({
        dayCommits: Object.fromEntries(names.map((name, index) => [name, 6 - index])),
        repos: names.map((name, index) => repo(name, 6 - index)),
      })
    )

    for (const name of ['a', 'b', 'c', 'd']) expect(screen.getByText(name)).toBeInTheDocument()
    expect(screen.queryByText('e')).not.toBeInTheDocument()
    expect(screen.getByText('+2 repos más')).toBeInTheDocument()
  })

  it('names private repos and marks them with a lock', () => {
    renderTooltip(week({ dayCommits: { secret: 5, web: 2 }, repos: [repo('secret', 5, true), repo('web', 2)] }))

    expect(screen.getByText('secret')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Repositorio privado')).toHaveLength(1)
  })

  it('marks repos created that day', () => {
    renderTooltip(
      week({
        dayCommits: { 'new-app': 8, 'old-app': 4 },
        repos: [repo('new-app', 8), repo('old-app', 4)],
        newRepos: ['new-app'],
      })
    )

    expect(screen.getAllByLabelText('Repositorio nuevo')).toHaveLength(1)
  })

  it('draws the daily commits of the 30 days ending on the point, current day highlighted', () => {
    const series = Array.from({ length: 40 }, (_, i) =>
      week({ end: dayAfter(i), dayCommits: i % 2 ? { web: i } : {} })
    )
    const point = series[35]
    render(<CustomTooltip active payload={[{ payload: point }]} series={series} />)

    const bars = screen.getByTestId('day-bars').querySelectorAll('[data-bar]')
    expect(bars).toHaveLength(30)
    expect(bars[29]).toHaveAttribute('data-current')
    expect(bars[29]).toHaveAttribute('data-value', '35')
    expect(bars[28]).toHaveAttribute('data-value', '0')
  })

  it('draws fewer bars near the start of the series', () => {
    const series = Array.from({ length: 5 }, (_, i) => week({ end: dayAfter(i) }))
    render(<CustomTooltip active payload={[{ payload: series[2] }]} series={series} />)

    expect(screen.getByTestId('day-bars').querySelectorAll('[data-bar]')).toHaveLength(3)
  })
})

describe('RepoMarker', () => {
  const renderMarker = (point: ScaledHeroPoint) =>
    render(
      <svg>
        <RepoMarker cx={100} cy={200} index={0} payload={point} />
      </svg>
    )

  it('draws nothing for weeks without new repos', () => {
    const { container } = renderMarker(week())
    expect(container.querySelector('circle')).toBeNull()
  })

  it('draws a dot and the name of every repo created that week, private ones included', () => {
    const { container } = renderMarker(week({ newRepos: ['portfolio', 'secret-api'] }))

    expect(container.querySelector('circle')).not.toBeNull()
    expect(screen.getByText('portfolio')).toBeInTheDocument()
    expect(screen.getByText('secret-api')).toBeInTheDocument()
  })

  it('hides the names on narrow screens, where they would overlap', () => {
    const { container } = renderMarker(week({ newRepos: ['portfolio'] }))
    expect(container.querySelector('g.repo-labels')).toHaveClass('hidden', 'sm:block')
  })

  it('always puts the label below the dot, away from the hero text above the curve', () => {
    const labelY = (level: number) => {
      const { container, unmount } = renderMarker(week({ level, newRepos: ['portfolio'] }))
      const y = Number(container.querySelector('text')?.getAttribute('y'))
      unmount()
      return y
    }

    expect(labelY(2)).toBeGreaterThan(200)
    expect(labelY(8)).toBeGreaterThan(200)
  })
})

describe('chartTopFor', () => {
  it('starts the chart a little below the hero buttons', () => {
    expect(chartTopFor(450, 1000)).toBe(482)
  })

  it('stays below the buttons even on short screens, where the curve just gets smaller', () => {
    expect(chartTopFor(900, 1000)).toBe(932)
  })

  it('returns null when the buttons cannot be measured', () => {
    expect(chartTopFor(null, 1000)).toBeNull()
    expect(chartTopFor(450, 0)).toBeNull()
  })
})

describe('RepoMarker hover', () => {
  it('reports the repos of the dot while the cursor is on it', () => {
    const onHover = vi.fn()
    const { container } = render(
      <svg>
        <RepoMarker cx={100} cy={200} index={0} payload={week({ end: '2026-02-10', newRepos: ['portfolio'] })} onHover={onHover} />
      </svg>
    )
    const hitArea = container.querySelector('[data-repo-hit]') as Element

    fireEvent.mouseEnter(hitArea)
    expect(onHover).toHaveBeenLastCalledWith({ repos: ['portfolio'], createdOn: '2026-02-10' })

    fireEvent.mouseLeave(hitArea)
    expect(onHover).toHaveBeenLastCalledWith(null)
  })
})

describe('CustomTooltip fade', () => {
  const point = week({ dayCommits: { web: 2 }, repos: [{ name: 'web', commits: 12, isPrivate: false }] })

  it('fades in when it becomes active', () => {
    render(<CustomTooltip active payload={[{ payload: point }]} />)

    expect(screen.getByTestId('tooltip-card')).toHaveAttribute('data-state', 'visible')
  })

  it('keeps the last content while fading out, instead of vanishing at once', () => {
    const { rerender } = render(<CustomTooltip active payload={[{ payload: point }]} />)
    rerender(<CustomTooltip active={false} payload={[]} />)

    expect(screen.getByTestId('tooltip-card')).toHaveAttribute('data-state', 'hidden')
    expect(screen.getByText('web')).toBeInTheDocument()
  })

  it('also fades out when the cursor moves to a flat part of the curve', () => {
    const { rerender } = render(<CustomTooltip active payload={[{ payload: point }]} />)
    rerender(<CustomTooltip active payload={[{ payload: week({ commits: 0 }) }]} />)

    expect(screen.getByTestId('tooltip-card')).toHaveAttribute('data-state', 'hidden')
    expect(screen.getByText('web')).toBeInTheDocument()
  })
})

describe('CustomTooltip repo focus', () => {
  const focus = {
    repos: [{ name: 'celiamunozfisio.com', isPrivate: true }],
    createdOn: '2026-02-10',
    total: 130,
    activeDays: 20,
    weekly: [0, 4, 10, 0, 6],
  }

  it('titles the card with the repo and its visibility', () => {
    render(<CustomTooltip active payload={[{ payload: week() }]} focus={focus} />)

    expect(screen.getByText('celiamunozfisio.com')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Repositorio privado')).toHaveLength(1)
    expect(screen.getByText('Privado')).toBeInTheDocument()
  })

  it('dates the creation, without the last commit', () => {
    render(<CustomTooltip active payload={[{ payload: week() }]} focus={focus} />)

    expect(screen.getByText(/creado el 10 feb.*2026/i)).toBeInTheDocument()
    expect(screen.queryByText(/último commit/i)).not.toBeInTheDocument()
  })

  it('leads with the yearly numbers: commits, active days and commits per active day', () => {
    render(<CustomTooltip active payload={[{ payload: week() }]} focus={focus} />)

    expect(within(screen.getByTestId('focus-total')).getByText('130')).toBeInTheDocument()
    expect(within(screen.getByTestId('focus-days')).getByText('20')).toBeInTheDocument()
    expect(within(screen.getByTestId('focus-average')).getByText('6,5')).toBeInTheDocument()
    expect(screen.queryByText('30 días')).not.toBeInTheDocument()
  })

  it('draws one bar per week of the year for the repo', () => {
    render(<CustomTooltip active payload={[{ payload: week() }]} focus={focus} />)

    const bars = screen.getByTestId('focus-bars').querySelectorAll('[data-bar]')
    expect([...bars].map((bar) => bar.getAttribute('data-value'))).toEqual(['0', '4', '10', '0', '6'])
  })

  it('handles a repo without commits in the year', () => {
    const empty = { ...focus, repos: [{ name: 'fresh', isPrivate: false }], total: 0, activeDays: 0, weekly: [0, 0] }
    render(<CustomTooltip active payload={[{ payload: week({ commits: 0 }) }]} focus={empty} />)

    expect(screen.getByText('fresh')).toBeInTheDocument()
    expect(screen.getByText('Público')).toBeInTheDocument()
    expect(screen.getByText(/sin commits en el último año/i)).toBeInTheDocument()
    expect(within(screen.getByTestId('focus-average')).getByText('0')).toBeInTheDocument()
  })
})

describe('tooltipPosition', () => {
  it('places the tooltip just left of the cursor, vertically centred on it', () => {
    expect(tooltipPosition({ x: 1000, y: 250 }, 2000)).toEqual({ x: 1000 - 16 - 288, y: 250 })
  })

  it('flips to the right of the cursor when it would overflow the left edge', () => {
    expect(tooltipPosition({ x: 100, y: 250 }, 2000)).toEqual({ x: 116, y: 250 })
  })

  it('never goes past the right edge', () => {
    expect(tooltipPosition({ x: 150, y: 10 }, 400)).toEqual({ x: 400 - 288, y: 10 })
  })
})

describe('useLingeringValue', () => {
  it('is inactive and empty before any value arrives', () => {
    const { result } = renderHook(() => useLingeringValue<string>(null))
    expect(result.current).toEqual({ value: null, active: false })
  })

  it('keeps the last value after it goes away, so it can fade out', () => {
    const { result, rerender } = renderHook(({ value }) => useLingeringValue(value), {
      initialProps: { value: 'web' as string | null },
    })
    expect(result.current).toEqual({ value: 'web', active: true })

    rerender({ value: null })
    expect(result.current).toEqual({ value: 'web', active: false })

    rerender({ value: 'api' })
    expect(result.current).toEqual({ value: 'api', active: true })
  })
})

describe('CommitDayDot', () => {
  const renderDot = (active: boolean) =>
    render(
      <svg>
        <CommitDayDot cx={10} cy={20} payload={week({ dayCommits: { web: 2 } })} repos={['web']} active={active} />
      </svg>
    )

  it('marks the days with commits of the highlighted repo', () => {
    const { container } = renderDot(true)
    expect(container.querySelector('circle')).toHaveClass('opacity-100')
  })

  it('fades out with the highlight instead of staying on the curve', () => {
    const { container } = renderDot(false)
    expect(container.querySelector('circle')).toHaveClass('opacity-0', 'transition-opacity')
  })

  it('draws nothing on days without commits of the repo', () => {
    const { container } = render(
      <svg>
        <CommitDayDot cx={10} cy={20} payload={week({ dayCommits: { api: 2 } })} repos={['web']} active />
      </svg>
    )
    expect(container.querySelector('circle')).toBeNull()
  })
})
