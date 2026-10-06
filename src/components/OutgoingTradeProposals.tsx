import { useQuery } from '@tanstack/react-query'
import { Alert, Badge, Button, Card, Group, SimpleGrid, Stack, Text } from '@mantine/core'
import { getOutgoingTradeOffers, getTeamNames } from '../api/client'
import { queryClient } from '../api/queryClient'
import type { DraftConfig, TradeOffer } from '../api/types'
import { SkeletonRegion, TextSkeleton } from './skeletons'

function ProposalPlayers({ label, players }: {
  label: string
  players: TradeOffer['incoming_players']
}) {
  return (
    <div>
      <Text size="sm" fw={600}>{label}</Text>
      <ul>
        {players.map((player) => (
          <li key={player.espn_id}>{player.name || `ESPN player ${player.espn_id}`}</li>
        ))}
      </ul>
    </div>
  )
}

export function OutgoingTradeProposals({ config }: { config: DraftConfig }) {
  const query = useQuery({
    queryKey: ['outgoing-trade-proposals', config.league_id, config.team_id, config.season],
    queryFn: () => getOutgoingTradeOffers(config),
    staleTime: 30_000,
  }, queryClient)
  const names = useQuery({
    queryKey: ['trade-team-names', config.league_id],
    queryFn: () => getTeamNames(config.league_id),
    staleTime: 900_000,
  }, queryClient)

  return (
    <section className="trade-builder" aria-label="Outgoing trade proposals">
      <Group justify="space-between" mb="sm">
        <h2>Outgoing trade proposals</h2>
        <Button variant="default" size="xs" loading={query.isFetching}
          onClick={() => { void query.refetch(); void names.refetch() }}>
          Refresh proposals
        </Button>
      </Group>
      <Text size="sm" c="dimmed" mb="md">
        Generated proposals are staged for human approval.
      </Text>
      {query.isPending && (
        <SkeletonRegion label="Loading outgoing trade proposals">
          <TextSkeleton lines={5} />
        </SkeletonRegion>
      )}
      {query.isError && (
        <Alert color="red" mb="md">
          Could not load outgoing proposals: {query.error.message}
          {Boolean(query.data?.length) && ' Previously loaded proposals are shown below and may be out of date.'}
        </Alert>
      )}
      {!query.isError && query.data?.length === 0 && (
        <Text c="dimmed">No outgoing proposals awaiting approval.</Text>
      )}
      <Stack gap="md">
        {query.data?.map((offer) => (
          <Card key={offer.id} withBorder radius="md" component="article">
            <Group justify="space-between" mb="sm">
              <Text fw={600}>{(offer.to_team_id && names.data?.[offer.to_team_id]) || `Team ${offer.to_team_id}`}</Text>
              <Badge color="yellow">Awaiting approval</Badge>
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <ProposalPlayers label="You receive" players={offer.incoming_players} />
              <ProposalPlayers label="You send" players={offer.outgoing_players} />
            </SimpleGrid>
            <Text size="sm" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {offer.message || 'No explanation provided.'}
            </Text>
            <Text size="xs" c="dimmed" mt="sm">
              Generated <time dateTime={offer.executed_at}>{new Date(offer.executed_at).toLocaleString()}</time>
            </Text>
          </Card>
        ))}
      </Stack>
    </section>
  )
}
