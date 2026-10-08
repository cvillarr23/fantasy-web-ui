import { useSyncExternalStore } from 'react'
import { retryableResponse } from '../../api/tradeResponseRetry'
import type { DraftConfig } from '../../api/types'
import type { InboxAction, IncomingTrade, PublicationReceipt } from '../../api/tradeInboxTypes'
export function inboxScope(config: DraftConfig) {
  return `${config.league_id}:${config.team_id}:${config.season}:${config.mode}`
}
export function reviewSignature(row: IncomingTrade) {
  return JSON.stringify([
    row.espn_transaction_id,
    row.league_id,
    row.season,
    row.our_team_id,
    row.proposing_team_id,
    row.fingerprint,
    row.send_espn_ids,
    row.receive_espn_ids,
    row.send_players,
    row.receive_players,
    row.comment,
    row.expiration_date,
    row.other_items,
  ])
}
export function actionReason(
  row: IncomingTrade,
  config: DraftConfig,
  week: number | undefined,
  action: InboxAction,
  now = Date.now(),
): string | null {
  if (
    row.league_id !== config.league_id ||
    row.season !== config.season ||
    row.our_team_id !== config.team_id ||
    !row.proposing_team_id ||
    row.proposing_team_id === config.team_id
  )
    return 'Offer does not match your configured league, season and team.'
  if (
    row.status !== 'open' ||
    row.parse_issues.length ||
    row.espn_type !== 'TRADE_PROPOSAL' ||
    row.espn_status !== 'PENDING' ||
    !/^[a-f0-9]{64}$/.test(row.fingerprint ?? '')
  )
    return 'Only open, parsed offers are actionable.'
  const expiry = Date.parse(row.expiration_date ?? '')
  if (!Number.isFinite(expiry) || expiry <= now + 300000)
    return 'Offer is expired, has no verified expiry, or expires within five minutes.'
  const ids = [...row.send_espn_ids, ...row.receive_espn_ids]
  if (ids.some((id) => !/^-?[1-9]\d*$/.test(id)) || new Set(ids).size !== ids.length)
    return 'Player identities are invalid or duplicated.'
  if (row.publications.some((p) => p.status !== 'failed_before_publish'))
    return 'An action is queued, pending or unknown. Reconciliation is required.'
  if (row.response || (row.decision && Object.keys(row.decision).length > 0))
    return 'Worker response evidence requires reconciliation before another action.'
  if (action === 'decline') return null
  const score = row.score
  if (
    !score ||
    score.scoring_version !== 'trade-score-v1' ||
    score.scored_fingerprint !== row.fingerprint
  )
    return 'Score evidence for this offer is unavailable.'
  if (action === 'accept') {
    if (
      score.stale ||
      !week ||
      score.as_of_week !== week ||
      typeof score.final_score !== 'number' ||
      !Number.isFinite(score.final_score)
    )
      return 'Accept requires a current, non-stale final score.'
    if (score.exceeds_roster_limit)
      return 'Accept would exceed the roster limit; drops are not simulated.'
  } else {
    if (!week || score.as_of_week !== week)
      return 'Counter requires mappings scored for the selected current week.'
    const mapped = ids.map((id) => score.players[id]?.player_id)
    if (
      !row.send_espn_ids.length ||
      !row.receive_espn_ids.length ||
      mapped.some((id) => !id || id !== id.trim()) ||
      new Set(mapped).size !== mapped.length ||
      score.unmapped_espn_ids.length
    )
      return 'Counter unavailable: players are unmapped or mappings overlap.'
  }
  return null
}
export function outcomeCopy(row: IncomingTrade): string {
  const outcome =
    row.response?.status === 'response_unknown'
      ? 'unknown'
      : row.response?.status === 'responding'
        ? 'pending'
        : (row.decision?.outcome ?? (row.response?.status === 'rejected' ? 'rejected' : null))
  if (outcome === 'unknown')
    return 'Outcome unknown — manual verification required in Activity and ESPN. Once ESPN shows the offer unanswered, it can be retried.'
  if (outcome === 'blocked')
    return `Response blocked — closed locks: ${Array.isArray(row.decision?.closed_locks) ? row.decision.closed_locks.join(', ') : 'unavailable'}. No confirmed ESPN response.`
  if (outcome === 'rejected')
    return 'ESPN rejected the response, so it was not processed. Retry it explicitly to send it again.'
  if (row.status === 'responding' || outcome === 'pending')
    return 'Worker responding — ESPN outcome unconfirmed.'
  const confirmed: Record<string, string> = {
    accepted_pending_processing: 'Responded — accepted, pending processing in ESPN.',
    accepted: 'Responded — accepted in ESPN.',
    declined: 'Responded — declined in ESPN.',
  }
  if (typeof outcome === 'string' && confirmed[outcome]) {
    if (
      confirmed[row.status] &&
      row.status !== outcome &&
      !(row.status === 'accepted' && outcome === 'accepted_pending_processing')
    )
      return 'Conflicting worker outcomes — reconciliation required.'
    return row.status === 'accepted' ? confirmed.accepted : confirmed[outcome]
  }
  if (outcome != null)
    return `Unrecognized worker outcome ${String(outcome)} — reconciliation required.`
  if (confirmed[row.status]) return confirmed[row.status]
  if (row.response?.status === 'responded')
    return 'Worker recorded a response — confirmed outcome details unavailable. Verify in Activity.'
  const statuses: Record<string, string> = {
    open: 'Open',
    unparsed: 'Unparsed — actions unavailable',
    countered: 'Countered — recorded by worker',
    vetoed: 'Vetoed',
    expired: 'Expired',
    withdrawn: 'Withdrawn',
    closed_unknown: 'Closed with unknown outcome — manual verification required.',
  }
  return statuses[row.status] ?? `Unrecognized state ${row.status} — reconciliation required.`
}
export interface InboxAttempt {
  message: string
  transactionId?: string
  signature: string
  action: InboxAction
  comment: string | null
  priorTrackingIds: string[]
  startedAt: string
  approvedBy: string
  decisionKey?: string
  response?: PublicationReceipt
}
const prefix = 'fantasy-web-ui.inbox-action.'
const listeners = new Set<() => void>()
const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
export function attemptKey(config: DraftConfig, id: string) {
  return `${prefix}${inboxScope(config)}:${id}`
}
export function readAttempt(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return JSON.stringify({
      message: 'Cannot retain safety state. Actions are blocked.',
    })
  }
}
export function saveAttempt(key: string, value: InboxAttempt | null) {
  if (value) sessionStorage.setItem(key, JSON.stringify(value))
  else sessionStorage.removeItem(key)
  listeners.forEach((fn) => fn())
}
export function recordAttempt(key: string, value: InboxAttempt | null) {
  try {
    saveAttempt(key, value)
  } catch {
    /* Keep the durable pre-request uncertainty marker if storage stops accepting updates. */
  }
}
function parseAttempt(raw: string): InboxAttempt {
  const unknown = { message: 'Stored outcome is unknown. Reconciliation required.' } as InboxAttempt
  try {
    const value = JSON.parse(raw) as Partial<InboxAttempt> | null
    if (!value || typeof value !== 'object' || typeof value.message !== 'string') return unknown
    if (
      value.decisionKey &&
      (!Array.isArray(value.priorTrackingIds) ||
        typeof value.signature !== 'string' ||
        typeof value.startedAt !== 'string')
    )
      return unknown
    return value as InboxAttempt
  } catch {
    return unknown
  }
}
export function useAttempt(key: string): InboxAttempt | null {
  const raw = useSyncExternalStore(subscribe, () => readAttempt(key))
  return raw ? parseAttempt(raw) : null
}
export function retryProven(attempt: InboxAttempt, row: IncomingTrade): boolean {
  if (
    !attempt.decisionKey ||
    attempt.response ||
    attempt.action === 'counter' ||
    attempt.signature !== reviewSignature(row)
  )
    return false
  return (
    row.publications.some(
      (p) =>
        p.status === 'failed_before_publish' &&
        p.kind === 'decision' &&
        p.action === attempt.action &&
        p.fingerprint === row.fingerprint &&
        p.decision_key === attempt.decisionKey &&
        p.approved_by === attempt.approvedBy &&
        !attempt.priorTrackingIds.includes(p.tracking_id) &&
        Date.parse(p.approved_at) >= Date.parse(attempt.startedAt),
    ) && row.publications.every((p) => p.status === 'failed_before_publish')
  )
}
export async function decisionKey(row: IncomingTrade, action: InboxAction, comment: string | null) {
  const bytes = new TextEncoder().encode(
    JSON.stringify([
      'trade-response-v1',
      row.league_id,
      String(row.season),
      row.our_team_id,
      row.espn_transaction_id,
      action,
      row.fingerprint,
      comment?.trim() || null,
    ]),
  )
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
export const subscribeAttempts = subscribe
export function snapshotAttempts(scope: string) {
  try {
    const start = `${prefix}${scope}:`
    return JSON.stringify(
      Object.keys(sessionStorage)
        .filter((key) => key.startsWith(start))
        .sort()
        .map((key) => {
          const value = parseAttempt(sessionStorage.getItem(key) ?? 'null')
          return [key.slice(start.length), value]
        }),
    )
  } catch {
    return '[]'
  }
}

export function retryReason(
  row: IncomingTrade,
  config: DraftConfig,
  week: number | undefined,
): string | null {
  const kind = retryableResponse(row.response)
  if (!kind || (row.response?.action !== 'accept' && row.response?.action !== 'decline'))
    return 'No retryable worker response.'
  if (
    (kind === 'rejected' && row.status !== 'open') ||
    (kind === 'unknown' && row.status !== 'responding')
  )
    return 'Worker response does not match the current offer state.'
  if (
    row.publications.some(
      (p) =>
        p.status !== 'failed_before_publish' &&
        (p.status === 'pending' ||
          p.kind !== 'decision' ||
          p.decision_key !== row.response?.decision_key ||
          p.retry_of === row.response?.id),
    )
  )
    return 'A publication is pending, queued for this retry, or requires reconciliation.'
  return actionReason(
    { ...row, status: 'open', publications: [], decision: null, response: null },
    config,
    week,
    row.response.action,
  )
}
