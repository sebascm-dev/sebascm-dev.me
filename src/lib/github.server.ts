// Server-only. Never import from client components.
// Dashboard reads live in src/lib/github/; this module only triggers workflows.
import type { WorkflowDispatchPayload } from './github.types'

const GITHUB_API = 'https://api.github.com'

function getToken(): string {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error('GITHUB_TOKEN environment variable is not set')
  return token
}

export async function dispatchWorkflow(
  payload: WorkflowDispatchPayload
): Promise<{ accepted: true; repo: string; workflowId: string }> {
  const token = getToken()

  const res = await fetch(
    `${GITHUB_API}/repos/${payload.repo}/actions/workflows/${payload.workflowId}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: payload.ref, inputs: payload.inputs ?? {} }),
      cache: 'no-store',
    }
  )

  if (res.status !== 204) {
    throw new Error(`GitHub dispatch failed: ${res.status}`)
  }

  return { accepted: true, repo: payload.repo, workflowId: payload.workflowId }
}
