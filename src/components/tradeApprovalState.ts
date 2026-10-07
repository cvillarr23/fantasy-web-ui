import { useSyncExternalStore } from 'react'
import type { DraftConfig, TradeOffer } from '../api/types'
import type { TradeApprovalResponse } from '../api/tradeApproval'

export interface ApprovalAttempt {
  message: string
  configScope?: string
  counterparty?: string
  fingerprint?: string
  priorTrackingId?: string
  publicationFailed?: boolean
  response?: TradeApprovalResponse
}
const prefix = 'fantasy-web-ui.trade-approval.'
const listeners = new Set<() => void>()
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
export function readApprovalAttempt(key: string) {
  try { return sessionStorage.getItem(prefix + key) }
  catch { return JSON.stringify({ message: 'Cannot retain approval safety state. Approval is blocked.' }) }
}
export function useApprovalAttempt(key: string) {
  const raw = useSyncExternalStore(subscribe, () => readApprovalAttempt(key))
  if (!raw) return null
  try { return JSON.parse(raw) as ApprovalAttempt }
  catch { return { message: 'Approval outcome is unknown. Operator reconciliation is required.' } }
}
export function useApprovalAttempts(config: DraftConfig): [string, ApprovalAttempt][] {
  const raw = useSyncExternalStore(subscribe, () => {
    try {
      return JSON.stringify(Object.keys(sessionStorage).filter(key => key.startsWith(prefix)).sort()
        .map(key => [key.slice(prefix.length), sessionStorage.getItem(key)]))
    } catch { return '[]' }
  })
  return (JSON.parse(raw) as [string, string][]).flatMap(([key, value]) => {
    try {
      const attempt = JSON.parse(value) as ApprovalAttempt
      return attempt.configScope === scope(config) ? [[key, attempt] as [string, ApprovalAttempt]] : []
    } catch { return [] }
  })
}
export function saveApprovalAttempt(key: string, attempt: ApprovalAttempt | null) {
  // Persist before POST so leaving the page or reloading cannot expose a replay button.
  if (attempt) sessionStorage.setItem(prefix + key, JSON.stringify(attempt))
  else sessionStorage.removeItem(prefix + key)
  listeners.forEach(listener => listener())
}
export function recordApprovalOutcome(key: string, attempt: ApprovalAttempt | null) {
  try { saveApprovalAttempt(key, attempt) }
  catch {
    // The pre-request marker is already durable. If storage stops accepting writes,
    // retain that unknown outcome instead of clearing the guard or throwing again.
  }
}
export function scope(config: DraftConfig) {
  return `${config.league_id}:${config.team_id}:${config.season}:${config.mode}`
}
export function offerFingerprint(offer: TradeOffer) {
  return JSON.stringify([offer.offer_key, offer.league_id, offer.season, offer.from_team_id, offer.to_team_id,
    offer.source, offer.incoming_player_ids, offer.outgoing_player_ids, offer.message ?? null])
}
export function canReview(offer: TradeOffer, config: DraftConfig, rows: TradeOffer[]) {
  const copies = rows.filter(row => row.offer_key === offer.offer_key)
  return offer.status === 'awaiting_approval' && offer.league_id === config.league_id &&
    offer.season === config.season && offer.from_team_id === config.team_id && offer.source === 'proposal' &&
    Boolean(offer.to_team_id) && offer.to_team_id !== config.team_id &&
    offer.incoming_player_ids.length > 0 && offer.outgoing_player_ids.length > 0 &&
    copies.length > 0 && copies.every(row => row.status === 'awaiting_approval' && offerFingerprint(row) === offerFingerprint(offer))
}
export function retryProven(attempt: ApprovalAttempt, rows: TradeOffer[]) {
  return attempt.publicationFailed && rows.length > 0 && rows.every(row => row.status === 'awaiting_approval' && offerFingerprint(row) === attempt.fingerprint) &&
    rows.some(row => row.approval?.publish_error === 'Failed before publication; approval may be retried.' &&
      row.approval.tracking_id && row.approval.tracking_id !== attempt.priorTrackingId)
}
export const statusCopy: Record<string, string> = {
  awaiting_approval: 'Awaiting approval',
  approval_pending: 'Approval pending / publication outcome unconfirmed',
  approved: 'Queued — ESPN submission unconfirmed',
  submitting: 'Worker processing — ESPN submission unconfirmed',
  submitted: 'Worker confirmed submission to ESPN',
  submit_blocked: 'Worker blocked submission',
  dry_run_filled: 'Dry run — no live submission recorded',
  failure: 'Worker reported failure — inspect outcome before retrying',
}
