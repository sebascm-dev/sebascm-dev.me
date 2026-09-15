import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { RangeKey } from '@/lib/github/types'

const mockReplace = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/admin/github',
}))

import { RangeFilter } from '../RangeFilter'
import { RangeTransitionProvider } from '../RangeTransition'

function renderFilter(value: RangeKey) {
  return render(
    <RangeTransitionProvider>
      <RangeFilter value={value} />
    </RangeTransitionProvider>
  )
}

describe('RangeFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the four presets as a radio group with the current one checked', () => {
    renderFilter('30d')

    expect(screen.getByRole('radiogroup', { name: /periodo/i })).toBeInTheDocument()
    const radios = screen.getAllByRole('radio')
    expect(radios.map((radio) => radio.textContent)).toEqual(['7 días', '30 días', '90 días', '12 meses'])
    expect(screen.getByRole('radio', { name: '30 días' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: '7 días' })).toHaveAttribute('aria-checked', 'false')
  })

  it('keeps only the checked preset in the tab order', () => {
    renderFilter('90d')

    expect(screen.getByRole('radio', { name: '90 días' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('radio', { name: '30 días' })).toHaveAttribute('tabindex', '-1')
  })

  it('navigates to the selected range without scrolling', async () => {
    const user = userEvent.setup()
    renderFilter('30d')

    await user.click(screen.getByRole('radio', { name: '90 días' }))

    expect(mockReplace).toHaveBeenCalledWith('/admin/github?range=90d', { scroll: false })
  })

  it('removes the param when selecting the default range', async () => {
    const user = userEvent.setup()
    renderFilter('7d')

    await user.click(screen.getByRole('radio', { name: '12 meses' }))

    expect(mockReplace).toHaveBeenCalledWith('/admin/github', { scroll: false })
  })

  it('does nothing when selecting the range already shown', async () => {
    const user = userEvent.setup()
    renderFilter('30d')

    await user.click(screen.getByRole('radio', { name: '30 días' }))

    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('moves the selection with the arrow keys and wraps around', async () => {
    const user = userEvent.setup()
    renderFilter('7d')

    screen.getByRole('radio', { name: '7 días' }).focus()
    await user.keyboard('{ArrowLeft}')

    // 12m is the default range, so the param is dropped
    expect(mockReplace).toHaveBeenLastCalledWith('/admin/github', { scroll: false })
    expect(screen.getByRole('radio', { name: '12 meses' })).toHaveFocus()

    await user.keyboard('{ArrowRight}')
    expect(mockReplace).toHaveBeenLastCalledWith('/admin/github?range=7d', { scroll: false })
    expect(screen.getByRole('radio', { name: '7 días' })).toHaveFocus()
  })
})
