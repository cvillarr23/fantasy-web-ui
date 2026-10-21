import type { TradeCandidate, TradeCandidateList } from '../../api/tradeCandidateTypes'
import type { DraftConfig, LeagueTradeContext, RosterDeficitsResponse } from '../../api/types'

export const finderConfig: DraftConfig = { league_id: '123', team_id: '7', season: 2026, mode: 'live' }
export function candidate(overrides: Partial<TradeCandidate> = {}): TradeCandidate {
  const bye = { crunch_weeks_before: [], crunch_weeks_after: [], fixed: [], created: [] }
  return {
    candidate_key: 'candidate-1', counterparty: { team_id: '8', name: 'Rival Team' }, shape: '1for1',
    receive: [{ espn_id: '200', player_id: 'p200', name: 'Received Wideout', position: 'WR', nfl_team: 'SF', vorp: 7.8, nfl_bye_week: 9 }],
    send: [{ espn_id: '100', player_id: 'p100', name: 'Sent Back', position: 'RB', nfl_team: 'KC', vorp: 4.3, nfl_bye_week: 10 }],
    final_score: 9.4, our_lineup_gain: 12.6, our_weighted_gain: 13.8, counterparty_lineup_change: 4.4,
    counterparty_weighted_benefit: -4.4, our_schedule_adjustment: 1.2,
    scored_weeks: [5, 6, 7, 8], horizon_weeks: [5, 6, 7, 8], complete_horizon: true,
    bye_coverage: { us: bye, counterparty: bye }, status: 'proposable', reasons: [], ...overrides,
  }
}
export function candidates(overrides: Partial<TradeCandidateList> = {}): TradeCandidateList {
  return {
    league_id: '123', season: 2026, week: 5, horizon: 4, run_id: 'run-1', computed_at: new Date().toISOString(),
    total: 1, team_counts: [
      { team_id: '8', name: 'Rival Team', proposable: 12, needs_drop: 3, one_sided: 2 },
      { team_id: '9', name: 'Sunday Crew', proposable: 6, needs_drop: 1, one_sided: 3 },
    ], items: [candidate()], ...overrides,
  }
}
export const finderDeficits: RosterDeficitsResponse = {
  season: 2026, week: 5, roster_snapshot: 'current', teams: {
    '8': { RB: { rostered: 1, starters_required: 2, deficit: 1, net_vorp: 2 }, WR: { rostered: 5, starters_required: 2, deficit: 0, net_vorp: 20 } },
  },
}
export const finderContext: LeagueTradeContext = {
  league_id: '123', season: 2026, as_of_week: 5, start_week: 5, end_week: 8, regular_season_end_week: 14,
  lineup_slot_counts: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1 },
  roster_snapshot: { kind: 'current', source: 'ESPN', fetched_at: new Date().toISOString(), observed_week: 5, matches_as_of_week: true },
  strength_metric: { name: 'completed_fantasy_points_per_week_z', source: 'ESPN', league_mean: 100, league_stddev: 10, teams_with_strength: 3 },
  coverage: { unmapped_espn_ids: [], missing_metric_count: 0 },
  teams: {
    '8': { team_id: '8', name: 'Rival Team', roster: [], strength: { points_per_week: 113, completed_matchups: 4, completed_scoring_weeks: 4, unavailable_history_periods: 0, z_score: 1.3 },
      schedule: [{ week: 6, matchup_period: 6, status: 'scheduled', opponent_team_id: '7', opponent_name: 'Our Team', opponent_strength_z: 0.4 }],
      schedule_coverage: { scheduled_weeks: 4, bye_weeks: 0, unavailable_weeks: 0, strength_known_weeks: 4 }, schedule_strength_z: 0.4 },
  },
}
