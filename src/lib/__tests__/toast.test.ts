import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    promise: vi.fn(),
  },
}))

import { toast } from '../toast'
import { toast as sonnerToast } from 'sonner'

const mockSonner = vi.mocked(sonnerToast)

/** Sustituye window.Audio por un doble que devuelve lo que indique `playReturns` */
function stubAudio(playReturns: unknown) {
  const play = vi.fn(() => playReturns)
  // Debe ser construible: toast.ts usa `new Audio(...)`
  class AudioStub {
    volume = 0
    play = play
  }
  vi.stubGlobal('Audio', AudioStub)
  return play
}

describe('toast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // Regresion: jsdom y los navegadores sin soporte de media devuelven undefined
  // en play(), asi que encadenar .catch() directamente lanzaba un TypeError
  it('no lanza cuando play() devuelve undefined en vez de una Promise', () => {
    const play = stubAudio(undefined)

    expect(() => toast.success('ok')).not.toThrow()
    expect(play).toHaveBeenCalled()
    expect(mockSonner.success).toHaveBeenCalledWith('ok', undefined)
  })

  it('ignora silenciosamente el rechazo de play() (autoplay bloqueado)', async () => {
    stubAudio(Promise.reject(new Error('NotAllowedError')))

    expect(() => toast.error('fallo')).not.toThrow()
    await Promise.resolve()

    expect(mockSonner.error).toHaveBeenCalledWith('fallo', undefined)
  })

  it('delega cada variante en sonner', () => {
    stubAudio(Promise.resolve())

    toast.success('a')
    toast.error('b')
    toast.warning('c')
    toast.info('d')

    expect(mockSonner.success).toHaveBeenCalledWith('a', undefined)
    expect(mockSonner.error).toHaveBeenCalledWith('b', undefined)
    expect(mockSonner.warning).toHaveBeenCalledWith('c', undefined)
    expect(mockSonner.info).toHaveBeenCalledWith('d', undefined)
  })
})
