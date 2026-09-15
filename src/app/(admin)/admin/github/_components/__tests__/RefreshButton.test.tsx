import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockRefreshGithub = vi.hoisted(() => vi.fn())

vi.mock('../../actions', () => ({ refreshGithub: mockRefreshGithub }))

import { RefreshButton } from '../RefreshButton'

describe('RefreshButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('refreshes the data and shows a pending state while it runs', async () => {
    let finish: () => void = () => {}
    mockRefreshGithub.mockReturnValue(new Promise<void>((resolve) => { finish = resolve }))

    const user = userEvent.setup()
    render(<RefreshButton />)

    await user.click(screen.getByRole('button', { name: /actualizar/i }))

    expect(mockRefreshGithub).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(screen.getByRole('button')).toBeDisabled()
      expect(screen.getByRole('button')).toHaveTextContent('Actualizando…')
    })

    finish()

    await waitFor(() => {
      expect(screen.getByRole('button')).not.toBeDisabled()
      expect(screen.getByRole('button')).toHaveTextContent('Actualizar')
    })
  })
})
