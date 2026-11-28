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

export interface TradeScoreByeCoverage {
  crunch_weeks_before: number[]
  crunch_weeks_after: number[]
  fixed: number[]
  created: number[]
}

/** Core bumps N once per score change (fantasy-core-pipeline KNOWN_SCORING_VERSIONS), and
 * each version only adds fields, so any vN reads with the fields below. */
export type ScoringVersion = `trade-score-v${number}`

/** One named term of final_score (trade-score-v2+); in_final_score false is reported only. */
export interface TradeScoreComponent {
  value: number | null
  in_final_score: boolean
  unavailable_reasons: string[]
}

export interface TradeScoreRestOfSeasonWeek {
  week: number
  kind: 'regular' | 'playoff'
  weight: number
  our_delta: number | null
  counterparty_delta: number | null
}

/** The R term: weeks after the horizon through the last fantasy playoff week. A null value is
 * unavailable (no week could be scored), which is different from a real 0.0. */
export interface TradeScoreRestOfSeason {
  weeks: TradeScoreRestOfSeasonWeek[]
  scored_weeks: number[]
  unscored_weeks: { week: number; reasons: string[] }[]
  complete: boolean
  our_lineup_gain: number | null
  playoff_lineup_gain: number | null
  counterparty_lineup_change: number | null
  value: number | null
  unavailable_reasons: string[]
  costs_playoff_value: boolean
}

/** How likely the counterparty is to accept (core acceptance-v1). A ranking aid only: never a
 * score term and never a gate. */
export interface TradeScoreAcceptance {
  model_version: string
  likelihood: number
  terms: { base_logit: number; activity: number | null; fairness: number | null; market: number | null }
  inputs: {
    history: { offers: number; accepted: number; declined: number; expired: number; league_offers: number; league_accepted: number; league_rate: number; rate: number }
    activity: { trades: number | null; offers_to_us: number; z: number | null }
    fairness: { our_lineup_gain: number | null; counterparty_lineup_change: number | null; balance: number | null }
    market: { percent_owned_received: number | null; percent_owned_sent: number | null }
  }
  unavailable_inputs: string[]
}

export interface TradeScore {
  scoring_version: ScoringVersion
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
  weights: {
    strength_weight: number
    z_clamp: number
    indirect_factor: number
    // Absent from evidence scored before the rest-of-season term.
    ros_regular_weight?: number | null
    playoff_week_weight?: number | null
  }
  roster_impact: { us: TradeScoreTeamImpact; counterparty: TradeScoreTeamImpact }
  // Bye-crunch weeks each side has before and after the trade. Evidence only: the lineup
  // terms already count every bye week.
  bye_coverage?: { us: TradeScoreByeCoverage; counterparty: TradeScoreByeCoverage }
  schedule: { weeks: TradeScoreScheduleWeek[] }
  // Absent from evidence scored before the rest-of-season term.
  rest_of_season?: TradeScoreRestOfSeason | null
  // Absent from evidence scored before the acceptance estimate.
  acceptance?: TradeScoreAcceptance | null
  score: {
    our_lineup_gain: number | null
    counterparty_lineup_change: number | null
    our_weighted_gain: number | null
    our_schedule_adjustment: number | null
    counterparty_weighted_benefit: number | null
    rest_of_season_value?: number | null
    final_score: number | null
    final_score_unavailable_reasons: string[]
    // Absent from stored trade-score-v1 evidence.
    components?: Record<string, TradeScoreComponent> | null
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
