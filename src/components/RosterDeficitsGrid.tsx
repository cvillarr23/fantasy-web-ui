import { InfoTip } from './ui/InfoTip'
import { Alert, Table, Tooltip } from '@mantine/core'
import { SkeletonRegion, TableRowsSkeleton } from './skeletons'
import { useTeamNames } from '../hooks/useTeamNames'
import type { RosterDeficitsResponse, RosterPositionDeficit } from '../api/types'

// compute_roster_deficits filters to SKILL_POSITIONS only - no K or D/ST rows ever come back
// from GET /v1/roster/deficits, unlike the draft-pick comparison grids which cover all six.
const POSITION_COLUMNS = ['QB', 'RB', 'WR', 'TE'] as const

interface Props {
  deficits: RosterDeficitsResponse | null
  myTeamId: string
  /** First load: no data yet, render the placeholder grid. */
  loading?: boolean
  /** Showing the previous week's data while the next one loads. */
  updating?: boolean
}

export function RosterDeficitsGrid({ deficits, myTeamId, loading = false, updating = false }: Props) {
  const teamNames = useTeamNames()

  if (loading) {
    return (
      <section className="roster-deficits-grid" aria-label="Roster deficits by team and position">
        <h2>Roster deficits</h2>
        <SkeletonRegion label="Loading roster deficits">
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Team</Table.Th>
              {POSITION_COLUMNS.map((position) => (
                <Table.Th key={position}>{position}</Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {/* A typical league has 10-12 teams; matching that keeps the editor below from jumping. */}
            <TableRowsSkeleton columns={POSITION_COLUMNS.length + 1} rows={10} rowHeight={12} rowMinHeight={39} rowHeader />
          </Table.Tbody>
        </Table>
        </SkeletonRegion>
      </section>
    )
  }

  const entries = Object.entries(deficits?.teams ?? {})
  if (entries.length === 0) {
    return (
      <section className="roster-deficits-grid" aria-label="Roster deficits by team and position">
        <h2>Roster deficits</h2>
        <Alert color="gray">No roster data yet for this league/week.</Alert>
      </section>
    )
  }

  // Every team_id in league_rosters is already pre-seeded by compute_roster_deficits, even
  // with zero players at a position - no separate zero-team fallback needed here.
  const sortedEntries = entries.sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
  const orderedEntries = [
    ...sortedEntries.filter(([teamId]) => teamId === myTeamId),
    ...sortedEntries.filter(([teamId]) => teamId !== myTeamId),
  ]

  return (
    <section
      className="roster-deficits-grid"
      aria-label="Roster deficits by team and position"
      aria-busy={updating || undefined}
    >
      <h2>
        Roster deficits{deficits ? ` — season ${deficits.season}, week ${deficits.week}` : ''}{' '}
        <InfoTip label="roster deficits">Each cell shows players rostered / starters required at that position. A highlighted cell means you don't have enough players rostered to fill your required starting slots — a real deficit, not just thin bench depth.</InfoTip>
      </h2>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th scope="col">Team</Table.Th>
            {POSITION_COLUMNS.map((position) => (
              <Table.Th key={position} scope="col">{position}</Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {orderedEntries.map(([teamId, positions]) => {
            const isMyTeam = teamId === myTeamId
            return (
              <Table.Tr key={teamId} className={isMyTeam ? 'my-team-row' : undefined}>
                <Table.Th scope="row">{isMyTeam ? 'Your team' : (teamNames[teamId] ?? `Team ${teamId}`)}</Table.Th>
                {POSITION_COLUMNS.map((position) => {
                  const cell: RosterPositionDeficit | undefined = positions[position]
                  const rostered = cell?.rostered ?? 0
                  const required = cell?.starters_required ?? 0
                  const hasGap = (cell?.deficit ?? 0) > 0
                  const netVorp = cell?.net_vorp ?? 0
                  return (
                    <Table.Td key={position} className={hasGap ? 'gap-cell' : undefined}>
                      <Tooltip
                        multiline
                        maw={240}
                        label={
                          `${rostered} rostered / ${required} required to start`
                          + (hasGap ? ' — deficit, not enough rostered' : '')
                          + ` · Net VORP ${netVorp.toFixed(1)} (value over a replacement-level player at this position)`
                        }
                      >
                        <span>{rostered}/{required}</span>
                      </Tooltip>
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
