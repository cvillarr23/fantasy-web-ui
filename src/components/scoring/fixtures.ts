import type { MatchupResponse, PlayerLine, ScoreBreakdownLine, ScoringRule, ScoringRulesResponse } from '../../api/types'
import { liveMatchupFixture } from '../matchup/liveFixtures'

function rule(
  stat_key: string, label: string, category: string, points_per: number, unit: string | null, rule_label: string,
  position: string | null = null,
): ScoringRule {
  return { stat_key, label, category, points_per, unit, rule_label, position }
}

export const scoringRules: ScoringRulesResponse = {
  season: 2026,
  rules: [
    rule('passYd', 'Passing yards', 'Passing', 0.04, 'yds', '1 pt per 25 passing yds'),
    rule('passTD', 'Passing TD', 'Passing', 4, 'TD', '4 pts per passing TD'),
    rule('int', 'Interception thrown', 'Passing', -2, 'INT', '−2 pts per interception thrown'),
    rule('rushYd', 'Rushing yards', 'Rushing', 0.1, 'yds', '1 pt per 10 rushing yds'),
    rule('rushTD', 'Rushing TD', 'Rushing', 6, 'TD', '6 pts per rushing TD'),
    rule('rec', 'Receptions', 'Receiving', 1, 'rec', '1 pt per reception'),
    rule('recYd', 'Receiving yards', 'Receiving', 0.1, 'yds', '1 pt per 10 receiving yds'),
    rule('fumLost', 'Fumble lost', 'Turnovers', -2, 'lost', '−2 pts per fumble lost'),
    rule('sacks', 'Sacks', 'Defense', 1, 'sacks', '1 pt per sack', 'D/ST'),
    rule('ptsAllowed0', '0 points allowed', 'Defense', 5, null, '5 pts for allowing 0 points', 'D/ST'),
    rule('kickRetTD', 'Kickoff returned for TD', 'Returns', 6, 'TD', '6 pts per kickoff returned for a TD'),
  ],
}

function scored(stat_key: string, label: string, qty: number, unit: string, rule_label: string, points: number): ScoreBreakdownLine {
  return { stat_key, label, qty, unit, rule_label, points }
}

/** Breakdowns by player id: two of yours (the runner scores more) and one opponent. */
const BREAKDOWNS: Record<string, ScoreBreakdownLine[]> = {
  a1: [
    scored('passYd', 'Passing yards', 250, 'yds', '1 pt per 25 passing yds', 10),
    scored('int', 'Interception thrown', 1, 'INT', '−2 pts per interception thrown', -2),
  ],
  a2: [
    scored('rushYd', 'Rushing yards', 78, 'yds', '1 pt per 10 rushing yds', 7.8),
    scored('rushTD', 'Rushing TD', 1, 'TD', '6 pts per rushing TD', 6),
    scored('rec', 'Receptions', 3, 'rec', '1 pt per reception', 3),
  ],
  c1: [scored('passYd', 'Passing yards', 300, 'yds', '1 pt per 25 passing yds', 12)],
}

function withBreakdown(line: PlayerLine): PlayerLine {
  const breakdown = BREAKDOWNS[line.player_id]
  if (!breakdown || !line.live) return line
  const live_points = Math.round(breakdown.reduce((sum, l) => sum + l.points, 0) * 100) / 100
  return { ...line, live: { ...line.live, live_points, breakdown } }
}

/** The week-7 matchup under way, with scoring breakdowns for three players. */
export function scoredMatchupFixture(): MatchupResponse {
  const matchup = liveMatchupFixture('sunday')
  matchup.our_team.starters = matchup.our_team.starters.map(withBreakdown)
  matchup.opponent.starters = matchup.opponent.starters.map(withBreakdown)
  return matchup
}
