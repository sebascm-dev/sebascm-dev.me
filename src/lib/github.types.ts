import type React from 'react'

// Dashboard types live in src/lib/github/types.ts

export interface WorkflowDispatchPayload {
  repo: string
  workflowId: string
  ref: string
  inputs?: Record<string, string>
}

export type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}
