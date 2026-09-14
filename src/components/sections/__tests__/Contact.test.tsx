import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Contact from '../Contact'

vi.mock('@/app/actions/contact', () => ({
  sendContactEmail: vi.fn(),
}))

// Contact notifica via toast (sonner), no renderizando el mensaje en el DOM
vi.mock('@/lib/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}))

import { sendContactEmail } from '@/app/actions/contact'
import { toast } from '@/lib/toast'

const mockSend = vi.mocked(sendContactEmail)
const mockToast = vi.mocked(toast)

/** Rellena el formulario con datos validos */
async function fillForm() {
  await userEvent.type(screen.getByLabelText(/nombre/i), 'Seba')
  await userEvent.type(screen.getByLabelText(/email/i), 'seba@test.com')
  await userEvent.type(screen.getByLabelText(/mensaje/i), 'Mensaje de prueba')
}

describe('Contact', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('avisa de campo obligatorio cuando los campos están vacíos', async () => {
    render(<Contact />)

    await userEvent.click(screen.getByRole('button', { name: /enviar/i }))

    expect(mockToast.warning).toHaveBeenCalledWith(
      expect.stringMatching(/obligatorio/i)
    )
    // No debe llegar al server action si la validación falla
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('confirma con un toast de éxito después de un envío correcto', async () => {
    mockSend.mockResolvedValueOnce({ success: true })
    render(<Contact />)

    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }))

    expect(mockToast.success).toHaveBeenCalledWith(
      expect.stringMatching(/enviado/i)
    )
  })

  it('limpia el formulario después de un envío correcto', async () => {
    mockSend.mockResolvedValueOnce({ success: true })
    render(<Contact />)

    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }))

    expect(screen.getByLabelText(/nombre/i)).toHaveValue('')
    expect(screen.getByLabelText(/email/i)).toHaveValue('')
    expect(screen.getByLabelText(/mensaje/i)).toHaveValue('')
  })

  it('muestra el error devuelto por el server action', async () => {
    mockSend.mockResolvedValueOnce({ success: false, error: 'Error de red' })
    render(<Contact />)

    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }))

    expect(mockToast.error).toHaveBeenCalledWith('Error de red')
  })
})
