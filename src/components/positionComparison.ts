import type { TeamAggregate } from '../api/types'

export interface PositionComparisonRow {
  position: string
  yourCount: number
  leagueMean: number
  rank: number
  teamCount: number
}

const POSITION_ORDER = ['QB', 'RB', 'WR', 'TE', 'K', 'D/ST', 'DST']

function normalizeCount(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 0
  return value
}

function comparePositionName(a: string, b: string): number {
  const aIndex = POSITION_ORDER.indexOf(a)
  const bIndex = POSITION_ORDER.indexOf(b)
  if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex
  if (aIndex >= 0) return -1
  if (bIndex >= 0) return 1
  return a.localeCompare(b)
}

export function buildPositionComparisonRows(
  teamAggregates: Record<string, TeamAggregate> | null | undefined,
  myTeamId: string,
  teamIds?: string[],
): PositionComparisonRow[] {
  if (!teamAggregates || !myTeamId) return []
  const aggregateEntries = Object.entries(teamAggregates)
  if (aggregateEntries.length === 0) return []

  const positionSet = new Set<string>()
  for (const [, aggregate] of aggregateEntries) {
    const counts = aggregate.position_counts ?? {}
    for (const position of Object.keys(counts)) {
      if (position) positionSet.add(position)
    }
  }

  if (positionSet.size === 0) return []

  const positions = [...positionSet].sort(comparePositionName)
  const myCounts = teamAggregates[myTeamId]?.position_counts ?? {}
  // team_ids (from draft_slots) is the source of truth for how many teams are in the league,
  // once the backend sends it - a zero-pick team has no key in teamAggregates at all, and
  // without this the league mean/rank would be computed over only the teams that have picked
  // so far rather than the whole league.
  const teamCount = teamIds && teamIds.length > 0 ? teamIds.length : aggregateEntries.length

  return positions.map((position) => {
    const knownCounts = aggregateEntries.map(([, aggregate]) => normalizeCount(aggregate.position_counts?.[position]))
    const allCounts = [...knownCounts, ...Array(Math.max(teamCount - knownCounts.length, 0)).fill(0)]
    const yourCount = normalizeCount(myCounts[position])
    const leagueMean = allCounts.reduce((sum, count) => sum + count, 0) / teamCount
    const rank = allCounts.filter((count) => count > yourCount).length + 1

    return { position, yourCount, leagueMean, rank, teamCount }
  })
}
