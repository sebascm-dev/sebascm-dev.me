import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const PoolMock = vi.fn()

vi.mock('pg', () => ({
  default: { Pool: PoolMock },
  Pool: PoolMock,
}))

vi.mock('drizzle-orm/node-postgres', () => ({
  drizzle: vi.fn(() => ({ __brand: 'drizzle-instance' })),
}))

const TEST_URL = 'postgresql://user:pass@localhost:5432/test'

/** El pool cacheado sobrevive entre módulos, así que hay que limpiarlo a mano */
function clearPoolCache() {
  delete (globalThis as Record<string, unknown>).__dbPool
}

describe('db', () => {
  const originalUrl = process.env.DATABASE_URL

  beforeEach(() => {
    vi.resetModules()
    PoolMock.mockClear()
    clearPoolCache()
    process.env.DATABASE_URL = TEST_URL
  })

  afterEach(() => {
    process.env.DATABASE_URL = originalUrl
    clearPoolCache()
  })

  it('crea el Pool con la DATABASE_URL', async () => {
    await import('../db')

    expect(PoolMock).toHaveBeenCalledWith(
      expect.objectContaining({ connectionString: TEST_URL })
    )
  })

  // En dev, Next recarga los módulos en caliente: un Pool nuevo por recarga
  // agota las conexiones de Postgres en pocos minutos
  it('reutiliza el mismo Pool entre recargas de módulo', async () => {
    await import('../db')
    vi.resetModules()
    await import('../db')

    expect(PoolMock).toHaveBeenCalledTimes(1)
  })

  it('falla con un mensaje claro si falta DATABASE_URL', async () => {
    delete process.env.DATABASE_URL

    await expect(import('../db')).rejects.toThrow(/DATABASE_URL/)
  })

  it('exporta la instancia de drizzle', async () => {
    const { db } = await import('../db')

    expect(db).toBeDefined()
  })
})
