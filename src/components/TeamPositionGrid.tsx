import { Table } from '@mantine/core'
import { TableRowsSkeleton } from './skeletons'
import { useTeamNames } from '../hooks/useTeamNames'
import type { DraftStatusResponse } from '../api/types'

type TeamAggregates = NonNullable<DraftStatusResponse['team_aggregates']>
type TeamAggregateEntry = [string, { position_counts?: Record<string, number> }]

const POSITION_COLUMNS = [
  { label: 'QB', keys: ['QB'] },
  { label: 'RB', keys: ['RB'] },
  { label: 'WR', keys: ['WR'] },
  { label: 'TE', keys: ['TE'] },
  { label: 'K', keys: ['K'] },
  { label: 'D-ST', keys: ['D/ST', 'D-ST', 'DST'] },
] as const

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle]
  return (sorted[middle - 1] + sorted[middle]) / 2
}

function getPositionCount(positionCounts: Record<string, number> | undefined, aliases: readonly string[]): number {
  if (!positionCounts) return 0
  for (const alias of aliases) {
    const count = positionCounts[alias]
    if (typeof count === 'number') return count
  }
  return 0
}

interface Props {
  teamIds?: string[]
  teamAggregates: TeamAggregates | undefined
  myTeamId: string
  loading?: boolean
}

export function TeamPositionGrid({ teamIds, teamAggregates, myTeamId, loading = false }: Props) {
  const teamNames = useTeamNames()
  const entries = Object.entries(teamAggregates ?? {}) as TeamAggregateEntry[]
  const knownTeamIds = new Set(entries.map(([teamId]) => teamId))
  // team_ids (from draft_slots) is the source of truth once the backend sends it - it's what
  // lets a zero-pick team still get a row here, with an all-zero position_counts fallback,
  // instead of silently disappearing from the grid.
  const missingTeamIds = (teamIds ?? []).filter((teamId) => !knownTeamIds.has(teamId))
  const hasMyTeam = knownTeamIds.has(myTeamId) || missingTeamIds.includes(myTeamId)
  const allEntries: TeamAggregateEntry[] = [
    ...(hasMyTeam ? [] : ([[myTeamId, { position_counts: {} }]] as TeamAggregateEntry[])),
    ...entries,
    ...missingTeamIds.map((teamId): TeamAggregateEntry => [teamId, { position_counts: {} }]),
  ]
  const sortedEntries = allEntries
    .filter(([teamId]) => teamId.trim().length > 0)
    .sort(([teamA], [teamB]) => teamA.localeCompare(teamB, undefined, { numeric: true }))
  const orderedEntries = [
    ...sortedEntries.filter(([teamId]) => teamId === myTeamId),
    ...sortedEntries.filter(([teamId]) => teamId !== myTeamId),
  ]

  if (loading) {
    return (
      <section className="team-position-grid" aria-label="Team comparison by position counts" aria-busy="true">
        <h2>Team comparison</h2>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Team</Table.Th>
              {POSITION_COLUMNS.map((position) => (
                <Table.Th key={position.label}>{position.label}</Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <TableRowsSkeleton columns={POSITION_COLUMNS.length + 1} rows={4} rowHeight={12} rowMinHeight={39} rowHeader />
          </Table.Tbody>
        </Table>
      </section>
    )
  }

  if (orderedEntries.length === 0) return null

  const rows = orderedEntries.map(([teamId, aggregate]) => ({
    teamId,
    counts: POSITION_COLUMNS.map((position) => getPositionCount(aggregate.position_counts, position.keys)),
  }))

  const medians = POSITION_COLUMNS.map((_, index) => median(rows.map((row) => row.counts[index])))

  return (
    <section className="team-position-grid" aria-label="Team comparison by position counts">
      <h2>Team comparison</h2>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th scope="col">Team</Table.Th>
            {POSITION_COLUMNS.map((position) => (
              <Table.Th key={position.label} scope="col">{position.label}</Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row) => {
            const isMyTeam = row.teamId === myTeamId
            return (
              <Table.Tr key={row.teamId} className={isMyTeam ? 'my-team-row' : undefined}>
                <Table.Th scope="row">{isMyTeam ? 'Your team' : (teamNames[row.teamId] ?? `Team ${row.teamId}`)}</Table.Th>
                {row.counts.map((count, index) => {
                  const isGap = count < medians[index]
                  return (
                    <Table.Td key={POSITION_COLUMNS[index].label} className={isGap ? 'gap-cell' : undefined}>
                      {count}
                    </Table.Td>
                  )
                })}
              </Table.Tr>
            )
          })}
        </Table.Tbody>
      </Table>
    </section>
  )
}
