import type { Run } from '../../api/runs'
import { isWaitingRun, runLabel } from '../runFormat'

export interface ApprovalThen {
  job: string
  params: Record<string, unknown>
}

export interface ApprovalLink {
  href: string
  /** An in-app route, opened with the router; anything else is an ordinary link. */
  internal: boolean
}

/** An approval run launches nothing: it only waits for a person to decide. */
export const isApprovalRun = (run: Pick<Run, 'executor'>) => run.executor === 'approval'

function textOf(value: unknown) {
  return typeof value === 'string' ? value : ''
}

export const approvalTitle = (run: Pick<Run, 'trigger'>) => textOf(run.trigger?.title)

/** The run an approval starts once approved, or null when it only gates a chain step. */
export function approvalThen(run: Pick<Run, 'trigger'>): ApprovalThen | null {
  const then = run.trigger?.then
  if (!then || typeof then !== 'object') return null
  const { job, params } = then as Record<string, unknown>
  if (typeof job !== 'string' || !job) return null
  const entries = params && typeof params === 'object' ? (params as Record<string, unknown>) : {}
  return { job, params: entries }
}

/** Where a person reviews the approval. Only routes inside the app and http(s) addresses are
 * followed: the link comes from whatever opened the approval, so anything else is dropped. */
export function approvalLink(run: Pick<Run, 'trigger'>): ApprovalLink | null {
  const link = textOf(run.trigger?.link)
  if (link.startsWith('/') && !link.startsWith('//')) return { href: link, internal: true }
  if (/^https?:\/\//i.test(link)) return { href: link, internal: false }
  return null
}

/** Approve and Dismiss are for approvals with nowhere else to be decided, such as a chain
 * step. A trade offer is approved on the Trades page, which owns the message and the audit. */
export const decidableHere = (run: Pick<Run, 'executor' | 'status' | 'trigger'>) =>
  isApprovalRun(run) && isWaitingRun(run.status) && approvalLink(run) === null

const ENDINGS: Record<string, string> = {
  approved: 'Approved',
  dismissed: 'Dismissed',
  superseded: 'Replaced by a newer approval',
  expired: 'Expired before anyone decided',
}

/** How a finished approval ended, or empty while it still waits. */
export function approvalEnding(run: Pick<Run, 'status' | 'end_reason'>) {
  if (isWaitingRun(run.status) || !run.end_reason) return ''
  return ENDINGS[run.end_reason] ?? runLabel(run.end_reason)
}

/** "set-lineup (week: 9)", or just the job when it takes no params. */
export function thenText({ job, params }: ApprovalThen) {
  const args = Object.entries(params).map(([key, value]) => `${runLabel(key)}: ${String(value)}`)
  return args.length ? `${job} (${args.join(', ')})` : job
}
