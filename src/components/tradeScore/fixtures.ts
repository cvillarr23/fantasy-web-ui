import type { ProposalEvaluation, TradeScore } from '../../api/types'

const starter = (espn_id: string, name: string, position: string, vorp_score: number) =>
  ({ espn_id, player_id: `p${espn_id}`, name, position, vorp_score })

/** Weeks 5-8, all scored. Week 6 is head-to-head, week 7 is our fantasy bye. Values are
 * chosen to be distinct so each rendered number traces to exactly one response field. */
export function completeScore(): TradeScore {
  const lineupWeek = (week: number, delta: number) => ({
    week, before: 50, after: 50 + delta, delta,
    starters_before: [starter('100', 'Sent Back', 'RB', 4.25), starter('300', 'Stays Put', 'QB', 9)],
    starters_after: [starter('200', 'Received Wideout', 'WR', 7.75), starter('300', 'Stays Put', 'QB', 9)],
    held_slots: week === 8 ? ['K'] : [],
    excluded_players: week === 8 ? [{ espn_id: '400', reason: 'nfl_bye' }] : [],
  })
  const theirWeek = (week: number, delta: number) => ({
    ...lineupWeek(week, delta),
    starters_before: [starter('200', 'Received Wideout', 'WR', 7.75)],
    starters_after: [starter('100', 'Sent Back', 'RB', 4.25)],
    held_slots: [], excluded_players: [],
  })
  const sched = (week: number, extra: Partial<TradeScore['schedule']['weeks'][number]> = {}) => ({
    week, matchup_period: week, head_to_head: false,
    our_status: 'scheduled', our_opponent_team_id: '3', our_opponent_z: 1.37, our_multiplier: 1.34,
    counterparty_status: 'scheduled', counterparty_opponent_team_id: '5', counterparty_opponent_z: -0.82,
    counterparty_weight: 0.2, ...extra,
  })
  return {
    scoring_version: 'trade-score-v1', league_id: '123', season: 2026, as_of_week: 5,
    our_team: { team_id: '7', name: 'Our Team' },
    counterparty_team: { team_id: '8', name: 'Rival Team' },
    send: [{ espn_id: '100', player_id: 'p100', name: 'Sent Back', position: 'RB', nfl_team: 'KC' }],
    receive: [{ espn_id: '200', player_id: 'p200', name: 'Received Wideout', position: 'WR', nfl_team: 'SF' }],
    raw_vorp: { week: 5, incoming_total: 7.75, outgoing_total: 4.25, delta_vorp: 3.5, missing_player_ids: [], unmapped_espn_ids: [] },
    horizon: { start_week: 5, end_week: 8, scored_weeks: [5, 6, 7, 8], unscored_weeks: [], complete_horizon: true },
    weights: { strength_weight: 0.25, z_clamp: 2, indirect_factor: 0.25 },
    roster_impact: {
      us: { total_delta: 12.6, roster_size_before: 16, roster_size_after: 16, roster_limit: 16, exceeds_roster_limit: false,
        weeks: [lineupWeek(5, 3.1), lineupWeek(6, 3.2), lineupWeek(7, 3.3), lineupWeek(8, 3)] },
      counterparty: { total_delta: -4.4, roster_size_before: 15, roster_size_after: 15, roster_limit: 16, exceeds_roster_limit: false,
        weeks: [theirWeek(5, -1.1), theirWeek(6, -1.2), theirWeek(7, -1), theirWeek(8, -1.1)] },
    },
    schedule: { weeks: [
      sched(5),
      sched(6, { head_to_head: true, our_opponent_team_id: '8', our_opponent_z: 0.4, our_multiplier: 1.1,
        counterparty_opponent_team_id: '7', counterparty_opponent_z: 0.9, counterparty_weight: 1.1 }),
      sched(7, { our_status: 'bye', our_opponent_team_id: null, our_opponent_z: null, our_multiplier: 0 }),
      sched(8),
    ] },
    score: {
      our_lineup_gain: 12.6, counterparty_lineup_change: -4.4, our_weighted_gain: 13.84,
      our_schedule_adjustment: 1.24, counterparty_weighted_benefit: 2.07, final_score: 15.91,
      final_score_unavailable_reasons: [],
    },
    coverage: { unmapped_traded_espn_ids: [], partial_roster_weeks: [], nfl_schedule_unavailable_weeks: [] },
    roster_snapshot: { kind: 'current', source: 'ESPN mRoster', fetched_at: '2026-10-07T12:00:00Z', observed_week: 5, matches_as_of_week: true },
    strength_metric: { name: 'completed_fantasy_points_per_week_z', source: 'Stored ESPN scoring weeks', league_mean: 101, league_stddev: 12, teams_with_strength: 10 },
  }
}

/** Weeks 5-8 with weeks 7 and 8 unscored, and the final score withheld for unknown strength. */
export function partialScore(): TradeScore {
  const score = completeScore()
  const keep = (weeks: { week: number }[]) => weeks.filter((w) => w.week <= 6)
  score.horizon = {
    ...score.horizon, scored_weeks: [5, 6], complete_horizon: false,
    unscored_weeks: [
      { week: 7, reasons: ['no_week_metrics'] },
      { week: 8, reasons: ['lineup_unfillable', 'brand_new_reason'] },
    ],
  }
  score.roster_impact.us.weeks = keep(score.roster_impact.us.weeks) as typeof score.roster_impact.us.weeks
  score.roster_impact.counterparty.weeks = keep(score.roster_impact.counterparty.weeks) as typeof score.roster_impact.us.weeks
  score.roster_impact.us.total_delta = 6.3
  score.roster_impact.counterparty.total_delta = -2.3
  score.schedule.weeks[0] = { ...score.schedule.weeks[0], counterparty_status: 'unavailable', counterparty_opponent_team_id: null, counterparty_opponent_z: null, counterparty_weight: null }
  score.schedule.weeks[2] = { ...score.schedule.weeks[2], our_status: 'unavailable', our_multiplier: null }
  score.score = {
    our_lineup_gain: 6.3, counterparty_lineup_change: -2.3, our_weighted_gain: 7.12,
    our_schedule_adjustment: 0.82, counterparty_weighted_benefit: null, final_score: null,
    final_score_unavailable_reasons: ['unknown_counterparty_opponent_strength'],
  }
  score.coverage = { unmapped_traded_espn_ids: ['-16002'], partial_roster_weeks: [6], nfl_schedule_unavailable_weeks: [8] }
  score.raw_vorp = { ...score.raw_vorp, missing_player_ids: ['p999'], unmapped_espn_ids: ['-16002'] }
  score.roster_impact.counterparty.exceeds_roster_limit = true
  score.roster_impact.counterparty.roster_size_after = 17
  score.roster_snapshot = { ...score.roster_snapshot, observed_week: 6, matches_as_of_week: false }
  return score
}

/** No horizon week could be scored, so every lineup and weighted term is null. */
export function unscoredScore(): TradeScore {
  const score = completeScore()
  score.horizon = {
    ...score.horizon, scored_weeks: [], complete_horizon: false,
    unscored_weeks: [5, 6, 7, 8].map((week) => ({ week, reasons: ['missing_traded_player_metrics'] })),
  }
  score.roster_impact.us = { ...score.roster_impact.us, total_delta: null, weeks: [] }
  score.roster_impact.counterparty = { ...score.roster_impact.counterparty, total_delta: null, weeks: [] }
  score.score = {
    our_lineup_gain: null, counterparty_lineup_change: null, our_weighted_gain: null,
    our_schedule_adjustment: null, counterparty_weighted_benefit: null, final_score: null,
    final_score_unavailable_reasons: ['no_scored_weeks'],
  }
  return score
}

export function proposalEvaluation(score: TradeScore = completeScore()): ProposalEvaluation {
  return {
    version: 'proposal-evaluation-v1',
    evaluated_at: '2026-10-07T09:00:00Z',
    request: {
      league_id: '123', season: 2026, week: 5, horizon: 4, our_team_id: '7', counterparty_team_id: '8',
      send_espn_ids: ['100'], receive_espn_ids: ['200'],
    },
    score,
    target: { team_id: '8', position: 'RB', deficit: 1, severity: 6.2 },
    ranking: { basis: 'final_score', value_per_scored_week: 3.98, rank: 1, packages_proposed: 5, packages_scored: 4, packages_eligible: 2 },
    pitch: {
      message: 'Improve our receiving depth.',
      evidence: [
        { id: 'e1', path: '/roster_impact/counterparty/weeks/0/delta', text: 'Your week 5 lineup changes by -1.1' },
        { id: 'e2', path: '/schedule/weeks/1/head_to_head', text: 'We play each other in week 6' },
      ],
      cited_evidence_ids: ['e1'],
    },
  }
}
