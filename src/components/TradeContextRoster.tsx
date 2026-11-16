import { Table, Text } from '@mantine/core'
import type { TradeContextTeam } from '../api/types'

import { contextNumber } from './tradeContextFormat'
import { ByeBadge } from './player/ByeBadge'
import { EspnCells, EspnHeaders } from './player/EspnColumns'
import { useEspnSort } from './player/useEspnSort'

export function TradeContextRoster({ team, week }: { team: TradeContextTeam; week: number }) {
  const espnSort = useEspnSort(team.roster, (player) => player.espn)
  return (
    <section aria-label="Counterparty roster">
      <h3>{team.name}: current roster</h3>
      <Text size="sm" c="dimmed">VORP and projections are for week {week}.</Text>
      {team.bye_outlook && team.bye_outlook.crunch_weeks.length > 0 && (
        <Text size="sm">
          Their byes leave them short in {team.bye_outlook.crunch_weeks.map((w) => `week ${w}`).join(', ')}: a player who plays then is worth more to them.
        </Text>
      )}
      {!team.roster.length ? <Text>No players in the current roster snapshot.</Text> : (
        <Table.ScrollContainer minWidth={900}>
          <Table>
            <Table.Thead><Table.Tr>
              {['Player', 'Position / NFL team', 'Slot / eligible', 'Injury', 'VORP', 'Projected points'].map((label) => <Table.Th key={label}>{label}</Table.Th>)}
              <EspnHeaders sort={espnSort.sort} onSort={espnSort.toggle} />
            </Table.Tr></Table.Thead>
            <Table.Tbody>{espnSort.sorted?.map((player) => (
              <Table.Tr key={player.espn_id}>
                <Table.Td>
                  <Text>{player.name || `ESPN player ${player.espn_id}`}</Text>
                  <Text size="xs" c="dimmed">ESPN {player.espn_id} · {player.player_id === null ? 'Internal mapping unavailable' : `Internal ${player.player_id}`}</Text>
                </Table.Td>
                <Table.Td>
                  {player.position ?? 'Unknown'} / {player.nfl_team ?? 'Unknown'}{' '}
                  <ByeBadge byeWeek={player.nfl_bye_week} week={week} />
                </Table.Td>
                <Table.Td>{player.slot ?? 'Unknown'} / {player.eligible_slots.join(', ') || 'Unknown'}</Table.Td>
                <Table.Td>{player.injury_status ?? 'Not reported'}</Table.Td>
                <Table.Td>{contextNumber(player.metrics[String(week)]?.vorp_score)}</Table.Td>
                <Table.Td>{contextNumber(player.metrics[String(week)]?.projected_points)}</Table.Td>
                <EspnCells position={player.position} espn={player.espn} />
              </Table.Tr>
            ))}</Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </section>
  )
}
