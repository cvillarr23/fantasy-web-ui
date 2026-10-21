import type { TradeScore, TradeScoreTradedPlayer } from './tradeScoreTypes'

export type TradeCandidateShape = '1for1' | '2for1' | '1for2'
export type TradeCandidateStatus = 'proposable' | 'needs_drop' | 'one_sided'
export type TradeCandidateSort = 'final_score' | 'our_gain' | 'their_benefit'

export interface TradeCandidatePlayer extends TradeScoreTradedPlayer {
  vorp: number | null
  nfl_bye_week: number | null
}

export interface TradeCandidate {
  candidate_key: string
  counterparty: { team_id: string; name: string }
  shape: TradeCandidateShape
  receive: TradeCandidatePlayer[]
  send: TradeCandidatePlayer[]
  final_score: number | null
  our_lineup_gain: number | null
  our_weighted_gain: number | null
  counterparty_lineup_change: number | null
  counterparty_weighted_benefit: number | null
  our_schedule_adjustment: number | null
  scored_weeks: number[]
  horizon_weeks: number[]
  complete_horizon: boolean
  bye_coverage: NonNullable<TradeScore['bye_coverage']>
  status: TradeCandidateStatus
  reasons: string[]
}

export interface TeamCandidateCounts {
  team_id: string
  name: string
  proposable: number
  needs_drop: number
  one_sided: number
}

export interface TradeCandidateList {
  league_id: string
  season: number
  week: number
  horizon: number
  run_id: string
  computed_at: string
  total: number
  team_counts: TeamCandidateCounts[]
  items: TradeCandidate[]
}

export interface TradeCandidateParams {
  league_id: string
  season: number
  week: number
  counterparty_team_id?: string
  receive_position?: string
  send_position?: string
  shape?: TradeCandidateShape | ''
  status?: TradeCandidateStatus | 'all'
  sort?: TradeCandidateSort
  limit?: number
  offset?: number
}
