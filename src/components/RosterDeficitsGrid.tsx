import { Skeleton, Table, Tooltip } from '@mantine/core'
import type { RosterDeficitsResponse, RosterPositionDeficit } from '../api/types'

// compute_roster_deficits filters to SKILL_POSITIONS only - no K or D/ST rows ever come back
// from GET /v1/roster/deficits, unlike the draft-pick comparison grids which cover all six.
const POSITION_COLUMNS = ['QB', 'RB', 'WR', 'TE'] as const

interface Props {
  deficits: RosterDeficitsResponse | null
  myTeamId: string
  loading?: boolean
}

export function RosterDeficitsGrid({ deficits, myTeamId, loading = false }: Props) {
  if (loading) {
    return (
      <section className="roster-deficits-grid" aria-label="Roster deficits by team and position">
        <h2>Roster deficits</h2>
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
            {Array.from({ length: 4 }).map((_, row) => (
              <Table.Tr key={row}>
                <Table.Th><Skeleton height={12} width={70} /></Table.Th>
                {POSITION_COLUMNS.map((position) => (
                  <Table.Td key={position}><Skeleton height={12} width={30} mx="auto" /></Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </section>
    )
  }

  const entries = Object.entries(deficits?.teams ?? {})
  if (entries.length === 0) return null

  // Every team_id in league_rosters is already pre-seeded by compute_roster_deficits, even
  // with zero players at a position - no separate zero-team fallback needed here.
  const sortedEntries = entries.sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
  const orderedEntries = [
    ...sortedEntries.filter(([teamId]) => teamId === myTeamId),
    ...sortedEntries.filter(([teamId]) => teamId !== myTeamId),
  ]

  return (
    <section className="roster-deficits-grid" aria-label="Roster deficits by team and position">
      <h2>Roster deficits{deficits ? ` — season ${deficits.season}, week ${deficits.week}` : ''}</h2>
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
                <Table.Th scope="row">{isMyTeam ? 'Your team' : `Team ${teamId}`}</Table.Th>
                {POSITION_COLUMNS.map((position) => {
                  const cell: RosterPositionDeficit | undefined = positions[position]
                  const rostered = cell?.rostered ?? 0
                  const required = cell?.starters_required ?? 0
                  const hasGap = (cell?.deficit ?? 0) > 0
                  const netVorp = cell?.net_vorp ?? 0
                  return (
                    <Table.Td key={position} className={hasGap ? 'gap-cell' : undefined}>
                      <Tooltip label={`Net VORP: ${netVorp.toFixed(1)}`}>
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
