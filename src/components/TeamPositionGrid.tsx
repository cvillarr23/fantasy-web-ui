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
  teamAggregates: TeamAggregates | undefined
  myTeamId: string
}

export function TeamPositionGrid({ teamAggregates, myTeamId }: Props) {
  const entries = Object.entries(teamAggregates ?? {}) as TeamAggregateEntry[]
  const hasMyTeam = entries.some(([teamId]) => teamId === myTeamId)
  const allEntries: TeamAggregateEntry[] = hasMyTeam ? entries : [[myTeamId, { position_counts: {} }], ...entries]
  const sortedEntries = allEntries
    .filter(([teamId]) => teamId.trim().length > 0)
    .sort(([teamA], [teamB]) => teamA.localeCompare(teamB, undefined, { numeric: true }))
  const orderedEntries = [
    ...sortedEntries.filter(([teamId]) => teamId === myTeamId),
    ...sortedEntries.filter(([teamId]) => teamId !== myTeamId),
  ]

  if (orderedEntries.length === 0) return null

  const rows = orderedEntries.map(([teamId, aggregate]) => ({
    teamId,
    counts: POSITION_COLUMNS.map((position) => getPositionCount(aggregate.position_counts, position.keys)),
  }))

  const medians = POSITION_COLUMNS.map((_, index) => median(rows.map((row) => row.counts[index])))

  return (
    <section className="team-position-grid" aria-label="Team comparison by position counts">
      <h2>Team comparison</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Team</th>
            {POSITION_COLUMNS.map((position) => (
              <th key={position.label} scope="col">{position.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isMyTeam = row.teamId === myTeamId
            return (
              <tr key={row.teamId} className={isMyTeam ? 'my-team-row' : undefined}>
                <th scope="row">{isMyTeam ? 'Your team' : `Team ${row.teamId}`}</th>
                {row.counts.map((count, index) => {
                  const isGap = count < medians[index]
                  return (
                    <td key={POSITION_COLUMNS[index].label} className={isGap ? 'gap-cell' : undefined}>
                      {count}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
      {/* Until backend issues #38/#39 are fully rolled out everywhere, missing zero-pick teams or
          uncounted K/D-ST picks can still surface false-positive gap cells in this panel. */}
    </section>
  )
}
