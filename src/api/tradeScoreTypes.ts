// Mirrors fantasy-core-pipeline src/schemas/trade_score.py (POST /v1/trade/score). Reason
// codes stay open strings: core may add codes, and the UI must show unknown ones rather than
// drop them.

export interface TradeScoreRequest {
  league_id: string
  season: number
  week: number
  horizon: number
  our_team_id: string
  counterparty_team_id: string
  send_espn_ids: string[]
  receive_espn_ids: string[]
}

export interface TradeScoreTeam {
  team_id: string
  name: string
}

export interface TradeScoreTradedPlayer {
  espn_id: string
  player_id: string | null
  name: string | null
  position: string | null
  nfl_team: string | null
}

export interface TradeScoreStarter {
  espn_id: string
  player_id: string
  name: string | null
  position: string
  vorp_score: number
}

export interface TradeScoreLineupWeek {
  week: number
  before: number
  after: number
  delta: number
  starters_before: TradeScoreStarter[]
  starters_after: TradeScoreStarter[]
  held_slots: string[]
  excluded_players: { espn_id: string; reason: string }[]
}

export interface TradeScoreTeamImpact {
  total_delta: number | null
  roster_size_before: number
  roster_size_after: number
  roster_limit: number
  exceeds_roster_limit: boolean
  weeks: TradeScoreLineupWeek[]
}

export interface TradeScoreScheduleWeek {
  week: number
  matchup_period: number | null
  head_to_head: boolean
  our_status: string
  our_opponent_team_id: string | null
  our_opponent_z: number | null
  our_multiplier: number | null
  counterparty_status: string
  counterparty_opponent_team_id: string | null
  counterparty_opponent_z: number | null
  counterparty_weight: number | null
}

export interface TradeScore {
  scoring_version: 'trade-score-v1'
  league_id: string
  season: number
  as_of_week: number
  our_team: TradeScoreTeam
  counterparty_team: TradeScoreTeam
  send: TradeScoreTradedPlayer[]
  receive: TradeScoreTradedPlayer[]
  raw_vorp: {
    week: number
    incoming_total: number
    outgoing_total: number
    delta_vorp: number
    missing_player_ids: string[]
    unmapped_espn_ids: string[]
  }
  horizon: {
    start_week: number
    end_week: number
    scored_weeks: number[]
    unscored_weeks: { week: number; reasons: string[] }[]
    complete_horizon: boolean
  }
  weights: { strength_weight: number; z_clamp: number; indirect_factor: number }
  roster_impact: { us: TradeScoreTeamImpact; counterparty: TradeScoreTeamImpact }
  schedule: { weeks: TradeScoreScheduleWeek[] }
  score: {
    our_lineup_gain: number | null
    counterparty_lineup_change: number | null
    our_weighted_gain: number | null
    our_schedule_adjustment: number | null
    counterparty_weighted_benefit: number | null
    final_score: number | null
    final_score_unavailable_reasons: string[]
  }
  coverage: {
    unmapped_traded_espn_ids: string[]
    partial_roster_weeks: number[]
    nfl_schedule_unavailable_weeks: number[]
  }
  roster_snapshot: {
    kind: 'current'
    source: string
    fetched_at: string
    observed_week: number
    matches_as_of_week: boolean
  }
  strength_metric: {
    name: 'completed_fantasy_points_per_week_z'
    source: string
    league_mean: number | null
    league_stddev: number | null
    teams_with_strength: number
  }
}

/** Evidence the proposal generator stored with a staged offer. `score` is the verbatim
 * POST /v1/trade/score response the pitch was grounded in, and each `pitch.evidence[].path`
 * is a JSON Pointer into it. */
export interface ProposalEvaluation {
  version: 'proposal-evaluation-v1'
  evaluated_at: string
  request: TradeScoreRequest
  score: TradeScore
  target?: { team_id: string; position: string; deficit: number; severity: number } | null
  ranking?: {
    basis: 'final_score' | 'our_lineup_gain' | string
    value_per_scored_week: number | null
    rank: number
    packages_proposed: number
    packages_scored: number
    packages_eligible: number
  } | null
  pitch?: {
    message: string
    evidence: { id: string; path: string; text: string }[]
    cited_evidence_ids: string[]
  } | null
}
