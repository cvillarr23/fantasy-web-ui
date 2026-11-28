import type { EspnOwnership } from './types'
import type { TradeScore, TradeScoreTradedPlayer } from './tradeScoreTypes'

export type TradeCandidateShape = '1for1' | '2for1' | '1for2'
export type TradeCandidateStatus = 'proposable' | 'needs_drop' | 'one_sided'
export type TradeCandidateSort = 'final_score' | 'our_gain' | 'their_benefit' | 'rest_of_season'

export interface TradeCandidatePlayer extends TradeScoreTradedPlayer {
  vorp: number | null
  nfl_bye_week: number | null
  /** ESPN's league-wide market signal; carried into the builder when the finder prefills it. */
  espn?: EspnOwnership | null
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
  // Absent or null on rows stored before the rest-of-season term; null R is unavailable, not 0.
  rest_of_season_value?: number | null
  playoff_lineup_gain?: number | null
  costs_playoff_value?: boolean
  rest_of_season_weeks?: number[]
  rest_of_season_scored_weeks?: number[]
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
