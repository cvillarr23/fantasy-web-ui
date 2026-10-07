import { Table, Text } from '@mantine/core'
import type { TradeContextTeam } from '../api/types'

import { contextNumber } from './tradeContextFormat'

export function TradeContextRoster({ team, week }: { team: TradeContextTeam; week: number }) {
  return (
    <section aria-label="Counterparty roster">
      <h3>{team.name}: current roster</h3>
      <Text size="sm" c="dimmed">VORP and projections are for week {week}.</Text>
      {!team.roster.length ? <Text>No players in the current roster snapshot.</Text> : (
        <Table.ScrollContainer minWidth={620}>
          <Table>
            <Table.Thead><Table.Tr>
              {['Player', 'Position / NFL team', 'Slot / eligible', 'Injury', 'VORP', 'Projected points'].map((label) => <Table.Th key={label}>{label}</Table.Th>)}
            </Table.Tr></Table.Thead>
            <Table.Tbody>{team.roster.map((player) => (
              <Table.Tr key={player.espn_id}>
                <Table.Td>
                  <Text>{player.name || `ESPN player ${player.espn_id}`}</Text>
                  <Text size="xs" c="dimmed">ESPN {player.espn_id} · {player.player_id === null ? 'Internal mapping unavailable' : `Internal ${player.player_id}`}</Text>
                </Table.Td>
                <Table.Td>{player.position ?? 'Unknown'} / {player.nfl_team ?? 'Unknown'}</Table.Td>
                <Table.Td>{player.slot ?? 'Unknown'} / {player.eligible_slots.join(', ') || 'Unknown'}</Table.Td>
                <Table.Td>{player.injury_status ?? 'Not reported'}</Table.Td>
                <Table.Td>{contextNumber(player.metrics[String(week)]?.vorp_score)}</Table.Td>
                <Table.Td>{contextNumber(player.metrics[String(week)]?.projected_points)}</Table.Td>
              </Table.Tr>
            ))}</Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </section>
  )
}
