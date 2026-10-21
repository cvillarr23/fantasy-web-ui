import type { TradeScoreLineupWeek } from '../../api/tradeScoreTypes'
import type { LeagueTradeContext, RosterDeficitsResponse } from '../../api/types'

export function lineupChanges(week: TradeScoreLineupWeek) {
  const before = new Set(week.starters_before.map((p) => p.espn_id))
  const after = new Set(week.starters_after.map((p) => p.espn_id))
  return {
    leaving: week.starters_before.filter((p) => !after.has(p.espn_id)),
    entering: week.starters_after.filter((p) => !before.has(p.espn_id)),
  }
}
export function scoreTone(value: number | null) {
  return value == null || Math.abs(value) < 0.05 ? 'finder-neutral' : value > 0 ? 'finder-positive' : 'finder-negative'
}

export function teamNeeds(deficits: RosterDeficitsResponse | undefined, teamId: string) {
  const positions = deficits?.teams[teamId]
  if (!positions) return 'Needs / depth unavailable'
  const entries = Object.entries(positions)
  const needs = entries.filter(([, p]) => p.deficit > 0).map(([p]) => p)
  const surplus = entries.filter(([, p]) => p.rostered > p.starters_required).map(([p]) => p)
  return `Needs ${needs.join(', ') || 'none'} · deep at ${surplus.join(', ') || 'none'}`
}

export function headToHeadWeeks(context: LeagueTradeContext | undefined, teamId: string, ourTeamId: string) {
  return context?.teams[teamId]?.schedule.filter((w) => w.status === 'scheduled' && w.opponent_team_id === ourTeamId).map((w) => w.week) ?? []
}

