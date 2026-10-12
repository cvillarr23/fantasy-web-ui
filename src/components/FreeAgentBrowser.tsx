import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Alert, Button, Group, SegmentedControl, Select, Stack, Table, Text, TextInput } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { Link } from 'react-router-dom'
import { queryClient } from '../api/queryClient'
import { getWaiverFreeAgents } from '../api/client'
import type { DraftConfig, FreeAgentEntry, FreeAgentSort } from '../api/types'
import { InjuryBadge } from './player/InjuryBadge'
import { TableRowsSkeleton } from './skeletons'

export const FREE_AGENT_PAGE_SIZE = 25
const POSITIONS = ['', 'QB', 'RB', 'WR', 'TE', 'K', 'D/ST']
const HEADERS = ['Player', 'Projected', 'VORP', 'Suggested drop', '']

interface Props {
  config: DraftConfig
  week: number
  openRosterSlots: number
}

function signed(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}`
}

function reviewLink(week: number, player: FreeAgentEntry, dropEspnId?: string): string {
  const params = new URLSearchParams({ kind: 'waiver', week: String(week), add: player.espn_id })
  if (dropEspnId) params.set('drop', dropEspnId)
  return `/moves/review?${params}`
}

export function FreeAgentBrowser({ config, week, openRosterSlots }: Props) {
  const [search, setSearch] = useState('')
  const [q] = useDebouncedValue(search, 300)
  const [position, setPosition] = useState('')
  const [sort, setSort] = useState<FreeAgentSort>('vorp')
  const [offset, setOffset] = useState(0)
  const query = useQuery(
    {
      queryKey: ['waiver-free-agents', config.league_id, config.season, week, position, q, sort, offset],
      queryFn: () => getWaiverFreeAgents({
        season: config.season, week, position, q, sort, limit: FREE_AGENT_PAGE_SIZE, offset,
      }),
      enabled: Number.isInteger(week) && week > 0,
      // Paging, searching and re-sorting keep the current rows up (dimmed) instead of blanking.
      placeholderData: keepPreviousData,
    },
    queryClient,
  )
  const data = query.data
  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        Every unrostered player with an ESPN identity. Each claim opens the same review and
        confirmation step as a recommendation.
      </Text>
      <Group align="flex-end">
        <TextInput
          label="Search by name"
          value={search}
          onChange={(e) => {
            setSearch(e.currentTarget.value)
            setOffset(0)
          }}
        />
        <Select
          label="Position"
          data={POSITIONS.map((p) => ({ value: p, label: p || 'All' }))}
          value={position}
          allowDeselect={false}
          onChange={(v) => {
            setPosition(v ?? '')
            setOffset(0)
          }}
        />
        <SegmentedControl
          aria-label="Sort by"
          value={sort}
          data={[
            { value: 'vorp', label: 'VORP' },
            { value: 'projected', label: 'Projection' },
          ]}
          onChange={(v) => {
            setSort(v as FreeAgentSort)
            setOffset(0)
          }}
        />
      </Group>
      {data?.source_mode === 'rolling_prior_weeks' && (
        <Text size="xs" c="dimmed">
          Using prior-week averages (weeks {data.source_weeks?.join(', ')}) until this week&apos;s
          projections land.
        </Text>
      )}
      {query.error ? (
        // Not the empty state: a failed load must not read as "nobody is available".
        <Alert color="red">
          {query.error.message}
          <Button variant="subtle" onClick={() => void query.refetch()}>Retry</Button>
        </Alert>
      ) : (
        <>
          <Table.ScrollContainer minWidth={720}>
            <Table aria-label="Free agents" aria-busy={query.isPlaceholderData || query.isLoading || undefined}>
              <Table.Thead>
                <Table.Tr>
                  {HEADERS.map((heading, i) => <Table.Th key={i}>{heading}</Table.Th>)}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {query.isLoading ? (
                  <TableRowsSkeleton columns={HEADERS.length} />
                ) : (
                  data?.free_agents.map((player) => (
                    <Table.Tr key={player.espn_id}>
                      <Table.Td>
                        <Text fw={700} size="sm">{player.name}</Text>
                        <Group gap={6}>
                          <Text size="xs">{player.position} · {player.pro_team}</Text>
                          <InjuryBadge status={player.injury_status} />
                        </Group>
                      </Table.Td>
                      <Table.Td>{player.projected_points?.toFixed(1) ?? '—'}</Table.Td>
                      <Table.Td>{player.vorp_score?.toFixed(1) ?? '—'}</Table.Td>
                      <Table.Td>
                        {player.bench_player ? (
                          <>
                            <Text size="sm">{player.bench_player.name}</Text>
                            {player.vorp_delta != null && (
                              <Text size="xs" c="dimmed">Swap {signed(player.vorp_delta)} VORP</Text>
                            )}
                          </>
                        ) : (
                          <Text size="sm" c="dimmed">—</Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs" wrap="nowrap">
                          {openRosterSlots > 0 && (
                            <Button component={Link} to={reviewLink(week, player)} size="xs">
                              Add to open slot
                            </Button>
                          )}
                          {/* Defaults to the suggested drop; the review page can change it. */}
                          <Button
                            component={Link}
                            to={reviewLink(week, player, player.bench_player?.espn_id)}
                            size="xs"
                            variant={openRosterSlots > 0 ? 'default' : 'filled'}
                          >
                            Claim with drop
                          </Button>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          {data && data.free_agents.length === 0 && (
            <Text size="sm" c="dimmed">No free agents match.</Text>
          )}
          {data && data.total > 0 && (
            <Group>
              <Button
                variant="default"
                disabled={!offset}
                onClick={() => setOffset(Math.max(0, offset - FREE_AGENT_PAGE_SIZE))}
              >
                Previous
              </Button>
              <Text size="sm">
                {offset + 1}–{Math.min(offset + data.free_agents.length, data.total)} of {data.total}
              </Text>
              <Button
                variant="default"
                disabled={offset + FREE_AGENT_PAGE_SIZE >= data.total}
                onClick={() => setOffset(offset + FREE_AGENT_PAGE_SIZE)}
              >
                Next
              </Button>
            </Group>
          )}
        </>
      )}
    </Stack>
  )
}
