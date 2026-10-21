import { Badge, Stack, Table, Text } from '@mantine/core'
import type { TradeScore, TradeScoreLineupWeek } from '../../api/types'
import { InfoTip } from '../ui/InfoTip'
import { StrengthChip } from '../ui/StrengthChip'
import { lineupMoves, signedScore } from './tradeScoreFormat'
import { tradeGlossaryForWeights } from './tradeGlossary'
import { reasonLabel } from './tradeScoreReasons'

function Changes({ week }: { week?: TradeScoreLineupWeek }) {
  if (!week) return <Text size="xs" c="dimmed">Lineup evidence unavailable</Text>
  const { entered, left } = lineupMoves(week)
  const name = (player: typeof entered[number]) => player.name || `ESPN player ${player.espn_id}`
  return <Stack gap={2}>
    <Text fw={700}>{signedScore(week.delta)}</Text>
    {entered.length > 0 && <Text size="xs">Enters: {entered.map(name).join(', ')}</Text>}
    {left.length > 0 && <Text size="xs">Leaves: {left.map(name).join(', ')}</Text>}
    {!entered.length && !left.length && <Text size="xs">No change to the starting lineup.</Text>}
    {week.held_slots.length > 0 && <Text size="xs">Held without metrics: {week.held_slots.join(', ')}</Text>}
    {week.excluded_players.map(player => <Text size="xs" key={player.espn_id}>ESPN player {player.espn_id}: {reasonLabel(player.reason).label}</Text>)}
  </Stack>
}

export function WeeklyLineupTable({ score, teamNames }: { score: TradeScore; teamNames?: Record<string, string> }) {
  const glossary = tradeGlossaryForWeights(score.weights)
  const weeks = Array.from({ length: Math.max(0, score.horizon.end_week - score.horizon.start_week + 1) }, (_, i) => score.horizon.start_week + i)
  return <section>
    <Text fw={700} mb="sm">Week by week: where the score comes from</Text>
    <Table.ScrollContainer minWidth={780}>
      <Table aria-label="Week by week: where the score comes from">
        <Table.Thead><Table.Tr>
          <Table.Th>Week</Table.Th><Table.Th>Your opponent</Table.Th><Table.Th>Your lineup change</Table.Th>
          <Table.Th>Weight <InfoTip label="the weight">{glossary.opponentMultiplier}</InfoTip></Table.Th>
          <Table.Th>Their lineup change</Table.Th><Table.Th>Weighted</Table.Th>
        </Table.Tr></Table.Thead>
        <Table.Tbody>{weeks.map(week => {
          const row = score.schedule.weeks.find(item => item.week === week)
          const unscored = score.horizon.unscored_weeks.find(item => item.week === week)
          const ours = score.roster_impact.us.weeks.find(item => item.week === week)
          const theirs = score.roster_impact.counterparty.weeks.find(item => item.week === week)
          const scored = score.horizon.scored_weeks.includes(week) && !unscored && row
          return <Table.Tr key={week} aria-label={`Week ${week}`}>
            <Table.Th scope="row">{week}</Table.Th>
            {!scored ? <Table.Td colSpan={5}><Text fw={600}>Not scored</Text>{unscored?.reasons.map(reason => <Text size="xs" key={reason}>{reasonLabel(reason).label}</Text>)}</Table.Td> : <>
              <Table.Td>{row.our_status === 'bye' ? 'Fantasy bye' : row.our_status !== 'scheduled' ? 'Pairing unavailable' : <Stack gap={4}>
                <Text size="sm">{teamNames?.[row.our_opponent_team_id ?? ''] || (row.our_opponent_team_id === score.counterparty_team.team_id ? score.counterparty_team.name : `Team ${row.our_opponent_team_id}`)}</Text>
                <StrengthChip value={row.our_opponent_z} />{row.head_to_head && <Badge size="xs">Head-to-head</Badge>}
              </Stack>}</Table.Td>
              <Table.Td><Changes week={ours} /></Table.Td>
              <Table.Td>{row.our_multiplier == null ? 'Unknown' : `×${row.our_multiplier.toFixed(2)}`}</Table.Td>
              <Table.Td><Changes week={theirs} /></Table.Td>
              {/* Only the weekly product is derived; aggregate terms always come from core. */}
              <Table.Td>{signedScore(ours && row.our_multiplier != null ? ours.delta * row.our_multiplier : null)}</Table.Td>
            </>}
          </Table.Tr>
        })}</Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  </section>
}
