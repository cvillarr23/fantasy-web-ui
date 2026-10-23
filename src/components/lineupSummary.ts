import type { LineupRosterResponse, RosterDeficitsResponse } from '../api/types'
import { HEALTHY_STATUSES } from './player/InjuryBadge'

// compute_roster_deficits only returns these four, in the order the page lists them.
export const DEFICIT_POSITIONS = ['QB', 'RB', 'WR', 'TE'] as const

export interface PositionShortfall {
  position: string
  short: number
}

export function injuredStarterCount(roster: LineupRosterResponse): number {
  return roster.starters.filter((line) => line.injury_status && !HEALTHY_STATUSES.has(line.injury_status)).length
}

/** The positions where `teamId` can't fill its required starting slots. */
export function positionShortfalls(deficits: RosterDeficitsResponse, teamId: string): PositionShortfall[] {
  const positions = deficits.teams[teamId] ?? {}
  return DEFICIT_POSITIONS.flatMap((position) => {
    const short = positions[position]?.deficit ?? 0
    return short > 0 ? [{ position, short }] : []
  })
}
