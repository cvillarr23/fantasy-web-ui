import type { DraftConfig, LeagueTradeContext, TeamByeOutlook, TradeOffer } from '../../api/types'
import { completeScore, proposalEvaluation } from './fixtures'

export const tradeConfig: DraftConfig = { league_id: '123', team_id: '7', season: 2026, mode: 'live' }
export function stagedProposal(): TradeOffer {
  const score = completeScore()
  score.roster_impact.counterparty.total_delta = 0.4
  score.roster_impact.counterparty.weeks.forEach(week => { week.delta = 0.1; week.after = week.before + 0.1 })
  score.score = { ...score.score, our_weighted_gain: 11.694, our_schedule_adjustment: -0.906, counterparty_lineup_change: 0.4, counterparty_weighted_benefit: -0.17, final_score: 11.524 }
  score.bye_coverage = { us: { crunch_weeks_before: [8], crunch_weeks_after: [], fixed: [8], created: [] }, counterparty: { crunch_weeks_before: [], crunch_weeks_after: [], fixed: [], created: [] } }
  return {
    id: 1, offer_key: 'a'.repeat(64), status: 'awaiting_approval', source: 'proposal',
    league_id: '123', season: 2026, from_team_id: '7', to_team_id: '8',
    incoming_player_ids: ['200'], outgoing_player_ids: ['100'],
    incoming_players: [{ espn_id: '200', name: 'Received Wideout' }], outgoing_players: [{ espn_id: '100', name: 'Sent Back' }],
    executed_at: '2026-10-07T09:00:00Z', message: 'Improve our receiving depth.', drafted_message: 'Improve our receiving depth.', message_edited: false, edited_by: null,
    evaluation: proposalEvaluation(score),
  }
}
export const tradeContext: LeagueTradeContext = {
  league_id: '123', season: 2026, as_of_week: 5, start_week: 5, end_week: 8, regular_season_end_week: 14,
  lineup_slot_counts: { RB: 2, WR: 2 }, coverage: { unmapped_espn_ids: [], missing_metric_count: 0 },
  roster_snapshot: { kind: 'current', source: 'ESPN', fetched_at: '2026-10-07T12:00:00Z', observed_week: 5, matches_as_of_week: true },
  strength_metric: { name: 'completed_fantasy_points_per_week_z', source: 'Completed scoring weeks', league_mean: 100, league_stddev: 10, teams_with_strength: 2 },
  teams: Object.fromEntries([['7', 'Our Team', '100', 'Sent Back', 'RB', 'KC', 4.25, 8], ['8', 'Rival Team', '200', 'Received Wideout', 'WR', 'SF', 7.75, 9]].map(([id, name, espn, playerName, position, nfl, vorp, bye]) => [String(id), {
    team_id: String(id), name: String(name),
    roster: [{ espn_id: String(espn), player_id: `p${espn}`, name: String(playerName), position: String(position), nfl_team: String(nfl), slot: String(position), eligible_slots: [String(position)], injury_status: null, nfl_bye_week: Number(bye), metrics: { '5': { vorp_score: Number(vorp), projected_points: 15 } } }],
    strength: { points_per_week: 105, completed_matchups: 4, completed_scoring_weeks: 4, unavailable_history_periods: 0, z_score: 0.5 },
    schedule: [], schedule_coverage: { scheduled_weeks: 0, bye_weeks: 0, unavailable_weeks: 0, strength_known_weeks: 0 }, schedule_strength_z: null,
  }])),
}
export const byeOutlook: TeamByeOutlook = {
  team_id: '7', team_name: 'Our Team', season: 2026, start_week: 5, end_week: 8, schedule_known: true,
  median_lineup_value: 50, crunch_weeks: [8], players: [], weeks: [],
}
