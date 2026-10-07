import { Alert, Stack, Text } from '@mantine/core'
import type { LeagueTradeContext } from '../api/types'

export function TradeContextProvenance({ snapshot }: { snapshot: LeagueTradeContext['roster_snapshot'] }) {
  return (
    <Stack gap="xs">
      <Text size="sm">Current roster source: {snapshot.source} · Fetched <time dateTime={snapshot.fetched_at}>{new Date(snapshot.fetched_at).toLocaleString()}</time> · Observed ESPN week {snapshot.observed_week}</Text>
      {!snapshot.matches_as_of_week && <Alert color="yellow">Current ownership is shown; selecting a historical or future week does not reconstruct that week's roster.</Alert>}
    </Stack>
  )
}
