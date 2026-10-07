import { Badge, Card, Table, Text } from '@mantine/core'
import type { TradeContextTeam } from '../api/types'
import { contextNumber } from './tradeContextFormat'
const strengthLabel = (value: number | null) => value === null ? 'Unknown' : `${contextNumber(value, 2)} z`

export function TradeContextSchedule({ team, otherTeamId }: { team: TradeContextTeam; otherTeamId?: string }) {
  const { strength, schedule_coverage: coverage } = team
  return (
    <Card withBorder component="section" aria-label={`${team.name} fantasy schedule`}>
      <h3>{team.name}: fantasy schedule</h3>
      <Text>Team strength: {strengthLabel(strength.z_score)} · {contextNumber(strength.points_per_week)} completed points/week</Text>
      <Text size="sm">{strength.completed_matchups} completed matchups · {strength.completed_scoring_weeks} scoring weeks · {strength.unavailable_history_periods} unavailable history periods</Text>
      <Text>Average opponent strength: {strengthLabel(team.schedule_strength_z)}</Text>
      <Text size="sm" c="dimmed">{coverage.strength_known_weeks}/{coverage.scheduled_weeks} scheduled weeks with known strength · {coverage.bye_weeks} byes · {coverage.unavailable_weeks} unavailable weeks</Text>
      {!team.schedule.length ? <Text>No remaining regular-season schedule in this horizon.</Text> : (
        <Table.ScrollContainer minWidth={320}>
          <Table>
            <Table.Thead><Table.Tr><Table.Th>Week</Table.Th><Table.Th>Fantasy opponent</Table.Th><Table.Th>Strength</Table.Th></Table.Tr></Table.Thead>
            <Table.Tbody>{team.schedule.map((row) => (
              <Table.Tr key={row.week}>
                <Table.Td>{row.week}<Text size="xs" c="dimmed">Period {row.matchup_period}</Text></Table.Td>
                <Table.Td>
                  {row.status === 'bye' ? 'Bye' : row.status === 'unavailable' ? 'Pairing unavailable' : row.opponent_name || `Team ${row.opponent_team_id}`}
                  {row.status === 'scheduled' && row.opponent_team_id === otherTeamId && <Badge ml="xs">Head-to-head</Badge>}
                </Table.Td>
                <Table.Td>{row.status === 'scheduled' ? strengthLabel(row.opponent_strength_z) : '—'}</Table.Td>
              </Table.Tr>
            ))}</Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Card>
  )
}
