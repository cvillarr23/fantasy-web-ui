import { Alert, Badge, Group, Stack, Text } from '@mantine/core'
import type { DraftConfig } from '../../api/types'
import type { IncomingTrade, InboxPlayer } from '../../api/tradeInboxTypes'
import {
  THREAD_STATE_COPY,
  counterLimitReason,
  isThreaded,
  useIncomingThread,
} from './incomingThread'
const playerList = (players: InboxPlayer[]) =>
  players.map((p) => p.name ?? `ESPN player ${p.espn_id}`).join(', ') || 'nothing'
export function IncomingTradeThread({
  row,
  config,
  teamNames,
}: {
  row: IncomingTrade
  config: DraftConfig
  teamNames?: Record<string, string>
}) {
  const thread = useIncomingThread(config, row)
  if (!isThreaded(row)) return null
  const data = thread.data
  const limit = counterLimitReason(data)
  return (
    <Stack gap="xs" component="section" aria-label="Negotiation history">
      <Group>
        <Text fw={600}>Negotiation</Text>
        {data?.state && <Badge variant="light">{THREAD_STATE_COPY[data.state]}</Badge>}
        {data && (
          <Text size="sm">
            {data.our_counters} of {data.counter_limit} counters used
          </Text>
        )}
      </Group>
      {thread.isPending && <Text size="sm">Loading negotiation history…</Text>}
      {thread.isError && (
        <Text size="sm">Negotiation history unavailable: {thread.error.message}</Text>
      )}
      {data && (
        <ol>
          {data.turns.map((turn) => (
            <li key={`${turn.side}:${turn.espn_transaction_id}`}>
              <Text size="sm">
                {turn.side === 'ours'
                  ? 'You countered'
                  : `${teamNames?.[turn.proposing_team_id ?? ''] ?? `Team ${turn.proposing_team_id ?? 'unknown'}`} offered`}
                {turn.espn_transaction_id === row.espn_transaction_id ? ' (this offer)' : ''}: you
                receive {playerList(turn.receive_players)}; you send {playerList(turn.send_players)}{' '}
                · {turn.status}
                {turn.proposed_date ? ` · ${new Date(turn.proposed_date).toLocaleString()}` : ''}
              </Text>
            </li>
          ))}
        </ol>
      )}
      {limit && <Alert color="yellow">{limit}</Alert>}
    </Stack>
  )
}
