import { getAdminUser } from '@/lib/auth'
import { dispatchWorkflow } from '@/lib/github.server'
import { NextResponse } from 'next/server'
import type { WorkflowDispatchPayload } from '@/lib/github.types'

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as Partial<WorkflowDispatchPayload>
  const missing = (['repo', 'workflowId', 'ref'] as const).filter((k) => !body[k])
  if (missing.length > 0) {
    return NextResponse.json(
      { error: 'Missing required fields', fields: missing },
      { status: 400 }
    )
  }

  try {
    const result = await dispatchWorkflow(body as WorkflowDispatchPayload)
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 })
  }
}
