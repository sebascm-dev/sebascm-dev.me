import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('dispatchWorkflow', () => {
  const originalToken = process.env.GITHUB_TOKEN

  beforeEach(() => {
    process.env.GITHUB_TOKEN = 'test-token'
    mockFetch.mockReset()
    vi.resetModules()
  })

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.GITHUB_TOKEN
    } else {
      process.env.GITHUB_TOKEN = originalToken
    }
  })

  it('should return {accepted:true} on 204', async () => {
    mockFetch.mockResolvedValueOnce({ status: 204 })

    const { dispatchWorkflow } = await import('../github.server')
    const result = await dispatchWorkflow({
      repo: 'sebascm-dev/test-repo',
      workflowId: 'deploy.yml',
      ref: 'main',
    })

    expect(result.accepted).toBe(true)
    expect(result.repo).toBe('sebascm-dev/test-repo')
    expect(result.workflowId).toBe('deploy.yml')
  })

  it('should throw with status when non-204', async () => {
    mockFetch.mockResolvedValueOnce({ status: 422 })

    const { dispatchWorkflow } = await import('../github.server')
    await expect(
      dispatchWorkflow({
        repo: 'sebascm-dev/test-repo',
        workflowId: 'deploy.yml',
        ref: 'main',
      })
    ).rejects.toThrow(/422/)
  })
})
