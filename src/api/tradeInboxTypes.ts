import type { InboxResponse } from './tradeResponseRetry'
export type InboxFilter = 'live' | 'all'
export type InboxVisibility = 'visible' | 'hidden' | 'all'
export type InboxAction = 'accept' | 'decline' | 'counter'
export type TriageState = 'new' | 'seen' | 'snoozed' | 'dismissed'
export interface InboxScore {
  state: 'scored' | 'incomplete' | 'unavailable' | 'unscorable' | 'stale_ownership'
  scoring_version: 'trade-score-v1' | null
  as_of_week: number
  final_score: number | null
  complete_horizon: boolean | null
  unavailable_reasons: string[]
  raw_delta_vorp: number | null
  exceeds_roster_limit: boolean | null
  unmapped_espn_ids: string[]
  partial_reasons: string[]
  players: Record<string, { player_id: string | null; name: string | null }>
  scored_fingerprint: string
  scored_at: string
  retry: boolean
  stale: boolean
  error: string | null
}
export interface InboxPublication {
  kind: 'decision' | 'counter'
  status: 'pending' | 'queued' | 'failed_before_publish'
  tracking_id: string
  approved_by: string
  approved_at: string
  fingerprint: string
  decision_key?: string | null
  action?: 'accept' | 'decline' | null
  publish_error?: string | null
  retry_of?: number | null
  verified_not_answered?: boolean | null
}
export interface PublicationReceipt {
  espn_transaction_id: string
  status: 'queued'
  kind: 'decision' | 'counter'
  tracking_id: string
  approved_by: string
  approved_at: string
  duplicate: boolean
  decision_key: string | null
  action: 'accept' | 'decline' | null
  retry_of?: number | null
}
export interface IncomingTrade {
  id: number
  status: string
  league_id: string | null
  season: number | null
  executed_at: string
  espn_transaction_id: string
  related_transaction_id?: string | null
  thread_root_id?: string | null
  proposing_team_id: string | null
  our_team_id: string | null
  espn_type: string | null
  espn_status: string | null
  send_espn_ids: string[]
  receive_espn_ids: string[]
  send_players: { espn_id: string; name: string | null }[]
  receive_players: { espn_id: string; name: string | null }[]
  other_items: Record<string, unknown>[]
  player_names?: Record<string, string | null>
  proposed_date?: string | null
  expiration_date: string | null
  comment: string | null
  fingerprint: string | null
  review_token: string
  parse_issues: string[]
  triage: {
    state: TriageState
    by?: string | null
    at?: string | null
    snooze_until?: string | null
  } | null
  decision: Record<string, unknown> | null
  score: InboxScore | null
  shadow_policy: {
    would: 'accept' | 'decline' | 'none'
    reason: string
    thresholds: { accept_min: number | null; decline_max: number | null }
    policy_version: 'shadow-v1'
  } | null
  first_seen_at?: string | null
  last_seen_at: string | null
  missed_reads?: number
  exit_reason?: string | null
  publications: InboxPublication[]
  response?: InboxResponse | null
}
export type DecisionRequest = {
  action: 'accept' | 'decline'
  review_token: string
  approved_by: string
  comment?: string
}
export type CounterRequest = { approved_by: string; week: number; review_token: string }
export type TriageRequest = {
  state: TriageState
  by: string
  snooze_until?: string
}
