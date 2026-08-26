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

  return positions.map((position) => {
    const allCounts = aggregateEntries.map(([, aggregate]) => normalizeCount(aggregate.position_counts?.[position]))
    const yourCount = normalizeCount(myCounts[position])
    const leagueMean = allCounts.reduce((sum, count) => sum + count, 0) / aggregateEntries.length
    const rank = allCounts.filter((count) => count > yourCount).length + 1

    return { position, yourCount, leagueMean, rank, teamCount: aggregateEntries.length }
  })
}
