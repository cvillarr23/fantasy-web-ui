export interface TradeContextPlayer {
  espn_id: string
  player_id: string | null
  name: string | null
  position: string | null
  nfl_team: string | null
  slot: string | null
  eligible_slots: string[]
  injury_status: string | null
  metrics: Record<string, { vorp_score: number | null; projected_points: number | null }>
}

export interface FantasyScheduleWeek {
  week: number
  matchup_period: number
  status: 'scheduled' | 'bye' | 'unavailable'
  opponent_team_id: string | null
  opponent_name: string | null
  opponent_strength_z: number | null
}

export interface TradeContextTeam {
  team_id: string
  name: string
  roster: TradeContextPlayer[]
  strength: {
    points_per_week: number | null
    completed_matchups: number
    completed_scoring_weeks: number
    unavailable_history_periods: number
    z_score: number | null
  }
  schedule: FantasyScheduleWeek[]
  schedule_coverage: {
    scheduled_weeks: number
    bye_weeks: number
    unavailable_weeks: number
    strength_known_weeks: number
  }
  schedule_strength_z: number | null
}

export interface LeagueTradeContext {
  league_id: string
  season: number
  as_of_week: number
  start_week: number
  end_week: number
  regular_season_end_week: number
  lineup_slot_counts: Record<string, number>
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
  coverage: { unmapped_espn_ids: string[]; missing_metric_count: number }
  teams: Record<string, TradeContextTeam>
}
