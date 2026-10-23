import { headshot } from '../stories/fixtures'
import { candidate } from './tradeFinder/fixtures'
import type { TradeCandidate } from '../api/tradeCandidateTypes'
import type {
  DraftConfig, LineupPlayerLine, LineupRosterResponse, RosterDeficitsResponse, TeamByeOutlook,
  WaiverRecommendation, WaiverRecommendationsResponse,
} from '../api/types'

// Synthetic data for the Lineup stories and tests. The component library is published, so
// nothing here may come from a real league.

export const lineupConfig: DraftConfig = { league_id: '123', team_id: '7', season: 2026, mode: 'live' }

export function lineupPlayer(id: string, name: string, position: string, slot: string, overrides: Partial<LineupPlayerLine> = {}): LineupPlayerLine {
  return {
    player_id: id, espn_id: `espn-${id}`, name, position, slot, pro_team: 'KC', jersey: null, injury_status: null,
    bye_week: 12, headshot_url: headshot, deficit_flag: false, suggested_swap: null, net_vorp: 5.2,
    rumor_sentiment: null, rumor_confidence: null, rumor_suggested_action: null, ...overrides,
  }
}

export const lineupRoster: LineupRosterResponse = {
  starters: [
    lineupPlayer('qb', 'Sample Quarterback', 'QB', 'QB', { net_vorp: 12.4 }),
    lineupPlayer('rb', 'Sample Runner', 'RB', 'RB', { net_vorp: 9.1, bye_week: 9 }),
    lineupPlayer('wr', 'Sample Receiver', 'WR', 'WR', {
      net_vorp: 4.2, injury_status: 'QUESTIONABLE', rumor_sentiment: 'negative', rumor_confidence: 0.64,
      rumor_suggested_action: 'consider_benching',
      suggested_swap: { bench_for: 'WR', add_player_id: 'wr2', explanation: 'Questionable; the backup adds value.' },
    }),
    lineupPlayer('te', 'Sample Tight End', 'TE', 'TE', { net_vorp: 2, deficit_flag: true }),
  ],
  bench: [
    lineupPlayer('wr2', 'Sample Backup Receiver', 'WR', 'BE', { net_vorp: 7.6, rumor_sentiment: 'positive', rumor_confidence: 0.72, rumor_suggested_action: 'start_with_caution' }),
    lineupPlayer('rb2', 'Sample Second Runner', 'RB', 'BE', { net_vorp: 1.3, bye_week: 9, rumor_sentiment: 'neutral' }),
  ],
  lineup_slot_counts: { BE: 4, IR: 1 },
}

const cell = (rostered: number, required: number) => ({
  rostered, starters_required: required, deficit: Math.max(0, required - rostered), net_vorp: 1.5,
})
export const lineupDeficits: RosterDeficitsResponse = {
  season: 2026, week: 9, roster_snapshot: 'current',
  teams: {
    '7': { QB: cell(2, 1), RB: cell(4, 2), WR: cell(5, 2), TE: cell(1, 2) },
    '8': { QB: cell(2, 1), RB: cell(3, 2), WR: cell(4, 2), TE: cell(2, 1) },
    '9': { QB: cell(1, 1), RB: cell(5, 2), WR: cell(1, 2), TE: cell(2, 1) },
  },
}
export const lineupTeamNames = { '7': 'Sample Team', '8': 'Gridiron Ghosts', '9': 'Fourth and Long' }

const week = (n: number, crunch: boolean, onBye: string[] = []) => ({
  week: n, value: 30, shortfall: crunch ? 8 : 0, unfilled_slots: crunch ? ['RB'] : [], held_slots: [], on_bye: onBye,
  unknown: [], replacement_level_starters: 0, crunch,
})
export const lineupByeOutlook: TeamByeOutlook = {
  team_id: '7', team_name: 'Sample Team', season: 2026, start_week: 9, end_week: 12, schedule_known: true,
  median_lineup_value: 30, crunch_weeks: [9],
  weeks: [week(9, true, ['900', '901']), week(10, false), week(11, false), week(12, false)],
  players: [
    { espn_id: '900', name: 'Sample Runner', position: 'RB', nfl_team: 'KC', nfl_bye_week: 9 },
    { espn_id: '901', name: 'Sample Second Runner', position: 'RB', nfl_team: 'KC', nfl_bye_week: 9 },
  ],
}
export const lineupNoCrunchOutlook: TeamByeOutlook = {
  ...lineupByeOutlook, crunch_weeks: [], weeks: lineupByeOutlook.weeks.map((w) => ({ ...w, crunch: false, unfilled_slots: [], on_bye: [] })),
}

export function fillIn(name: string, gain: number | null, byeWeek = 9): WaiverRecommendation {
  return {
    kind: 'add', position: 'RB', vorp_delta: 3, rumor_sentiment: null, rumor_confidence: null, rumor_suggested_action: null,
    free_agent: { espn_id: `fa-${name}`, name, position: 'RB', pro_team: 'LAC', injury_status: null, net_vorp: 2 },
    bye_fill: gain === null ? null : { week: byeWeek, lineup_gain: gain },
  }
}
export const lineupWaivers: WaiverRecommendationsResponse = {
  season: 2026, week: 9,
  recommendations: [fillIn('Sample Free Agent', 3.1), fillIn('Sample Waiver Back', 4.8), fillIn('Sample Not A Fill-in', null), fillIn('Sample Other Week', 9, 12)],
  bye_crunch_weeks: [9],
}

export function byeFixTrade(key: string, counterparty: string, fixed: number[], status: TradeCandidate['status'] = 'proposable'): TradeCandidate {
  const base = candidate({ candidate_key: key, counterparty: { team_id: '8', name: counterparty }, status })
  return {
    ...base,
    receive: [{ ...base.receive[0], name: 'Sample Fill-in Back', position: 'RB' }],
    send: [{ ...base.send[0], name: 'Sample Surplus Receiver', position: 'WR' }],
    bye_coverage: { ...base.bye_coverage, us: { ...base.bye_coverage.us, fixed } },
  }
}
export const lineupTradeCandidates = [
  byeFixTrade('t1', 'Gridiron Ghosts', [9]),
  byeFixTrade('t2', 'No Help Team', []),
  byeFixTrade('t3', 'Fourth and Long', [9], 'needs_drop'),
]
