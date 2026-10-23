import { Link } from 'react-router-dom'
import { Alert, Button, Group, Table, Text } from '@mantine/core'
import { InfoTip } from './ui/InfoTip'
import { SkeletonRegion, TableRowsSkeleton } from './skeletons'
import { useTeamNames } from '../hooks/useTeamNames'
import { lineupGlossary } from './lineupGlossary'
import { DEFICIT_POSITIONS } from './lineupSummary'
import type { RosterDeficitsResponse, RosterPositionDeficit } from '../api/types'

interface Props {
  deficits: RosterDeficitsResponse | null
  myTeamId: string
  /** First load: no data yet, render the placeholder grid. */
  loading?: boolean
  /** Showing the previous week's data while the next one loads. */
  updating?: boolean
}

function ownStatus(cell: RosterPositionDeficit | undefined): { text: string; short: boolean } {
  if (!cell) return { text: 'No data', short: false }
  if (cell.deficit > 0) return { text: `Short ${cell.deficit}`, short: true }
  const spare = cell.rostered - cell.starters_required
  return { text: spare > 0 ? `Covered, ${spare} spare` : 'Covered', short: false }
}

const cellLabel = (cell: RosterPositionDeficit | undefined) => cell ? `${cell.rostered}/${cell.starters_required}` : '—'

/** Where the league's rosters can't fill their starting slots, with your own gaps first. */
export function RosterDeficitsGrid({ deficits, myTeamId, loading = false, updating = false }: Props) {
  const teamNames = useTeamNames()

  if (loading) {
    return (
      <section className="roster-deficits-grid" aria-label="Roster deficits by team and position">
        <SkeletonRegion label="Loading roster deficits">
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Team</Table.Th>
              {DEFICIT_POSITIONS.map((position) => (
                <Table.Th key={position}>{position}</Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {/* A typical league has 10-12 teams; matching that keeps the editor below from jumping. */}
            <TableRowsSkeleton columns={DEFICIT_POSITIONS.length + 1} rows={10} rowHeight={12} rowMinHeight={39} rowHeader />
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
  const mine = deficits?.teams[myTeamId]
  const shortPositions = DEFICIT_POSITIONS.filter((position) => (mine?.[position]?.deficit ?? 0) > 0)
  const weekQuery = deficits ? `?week=${deficits.week}` : ''

  return (
    <section
      className="roster-deficits-grid"
      aria-label="Roster deficits by team and position"
      aria-busy={updating || undefined}
    >
      <Text c="dimmed" size="sm" mb="sm">
        {deficits ? `Season ${deficits.season}, week ${deficits.week}. ` : ''}
        Counts are players rostered / starters your league requires.{' '}
        <InfoTip label="rostered over required">{lineupGlossary.rosterDeficits}</InfoTip>
      </Text>

      {mine && (
        <>
          <h3>Your positions</h3>
          <div className="deficit-tiles">
            {DEFICIT_POSITIONS.map((position) => {
              const status = ownStatus(mine[position])
              return (
                <div key={position} className={`deficit-tile${status.short ? ' deficit-tile-short' : ''}`}>
                  <span className="deficit-tile-position">{position}</span>
                  <span className="deficit-tile-count">{cellLabel(mine[position])}</span>
                  <span className="deficit-tile-status">
                    {mine[position] && <span aria-hidden="true">{status.short ? '▲ ' : '✓ '}</span>}{status.text}
                  </span>
                </div>
              )
            })}
          </div>
          {shortPositions.length > 0 && (
            <Group gap="sm" mt="sm" mb="md">
              <Text size="sm">
                You can't fill every starting slot at {shortPositions.join(', ')}.
              </Text>
              <Button component={Link} to={`/waivers${weekQuery}#free-agents`} size="xs" variant="default">
                Find a free agent
              </Button>
              <Button component={Link} to={`/trades${weekQuery}#finder`} size="xs" variant="default">
                Look for a trade
              </Button>
            </Group>
          )}
        </>
      )}

      <h3>League <Text span size="sm" c="dimmed" fw={400}>your team first</Text></h3>
      <Table.ScrollContainer minWidth={0}>
        <Table className="deficit-league-table">
          <Table.Thead>
            <Table.Tr>
              <Table.Th scope="col">Team</Table.Th>
              {DEFICIT_POSITIONS.map((position) => (
                <Table.Th key={position} scope="col">{position}</Table.Th>
              ))}
              <Table.Th scope="col">Short at</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {orderedEntries.map(([teamId, positions]) => {
              const isMyTeam = teamId === myTeamId
              const shortAt = DEFICIT_POSITIONS.filter((position) => (positions[position]?.deficit ?? 0) > 0)
              return (
                <Table.Tr key={teamId} className={isMyTeam ? 'my-team-row' : undefined}>
                  <Table.Th scope="row">{isMyTeam ? 'Your team' : (teamNames[teamId] ?? `Team ${teamId}`)}</Table.Th>
                  {DEFICIT_POSITIONS.map((position) => {
                    const cell: RosterPositionDeficit | undefined = positions[position]
                    const hasGap = (cell?.deficit ?? 0) > 0
                    return (
                      <Table.Td key={position} data-position={position} className={hasGap ? 'gap-cell' : undefined}>
                        {cellLabel(cell)}
                        {hasGap && <span className="gap-cell-label"> short</span>}
                      </Table.Td>
                    )
                  })}
                  <Table.Td data-position="Short at" className={shortAt.length === 0 ? 'muted' : undefined}>
                    {shortAt.length > 0 ? shortAt.join(', ') : 'None'}
                  </Table.Td>
                </Table.Tr>
              )
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </section>
  )
}
