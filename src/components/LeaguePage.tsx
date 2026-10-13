import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Checkbox,
  Group,
  SegmentedControl,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { useDraftConfig } from '../hooks/useDraftConfig'
import { useSelectedWeek } from '../hooks/useSelectedWeek'
import { getLeagueRows } from '../api/dashboard'
import { WeekSelector } from './ui/WeekSelector'
import { ScoreValue } from './ui/ScoreValue'
import { SkeletonRegion, TableSkeleton } from './skeletons'
import { Pager } from './ui/Pager'
export function LeaguePage() {
  const { config } = useDraftConfig()
  const [week, setWeek] = useSelectedWeek()
  const [view, setView] = useState('standings')
  const [search, setSearch] = useState('')
  const [q] = useDebouncedValue(search, 300)
  const [position, setPosition] = useState('')
  const [owner, setOwner] = useState('')
  const [totals, setTotals] = useState(false)
  const [offset, setOffset] = useState(0)
  const query = useQuery({
    queryKey: [
      'league',
      config.league_id,
      config.season,
      view,
      week,
      offset,
      q,
      position,
      owner,
      totals,
    ],
    queryFn: () =>
      getLeagueRows(view, config.season, Number(week), offset, q, position, owner, totals),
    enabled: Boolean(week && config.league_id),
    refetchInterval: view === 'standings' ? 60_000 : false,
    // Paging, filtering and searching keep the current rows up (dimmed) instead of blanking.
    // Switching view starts clean: standings rows don't fit the player-leader columns.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[3] === view ? keepPreviousData(previous) : undefined,
  })
  const headers =
    view === 'standings'
      ? ['Rank', 'Team', 'Record', 'Fantasy points', 'Points against']
      : ['Rank', 'Player', 'Position / Owner', 'Fantasy points', 'Projected points']
  return (
    <div className="dashboard">
      <Stack>
        <Group justify="space-between">
          <h2>Your league</h2>
          <Button variant="default" onClick={() => void query.refetch()}>
            Refresh
          </Button>
        </Group>
        <SegmentedControl
          value={view}
          onChange={(v) => {
            setView(v)
            setOffset(0)
          }}
          data={[
            { value: 'standings', label: 'Team standings' },
            { value: 'player-leaders', label: 'Player leaders' },
          ]}
        />
        {view === 'player-leaders' ? (
          <>
            <WeekSelector week={week} onChange={setWeek} />
            <Group align="end">
              <TextInput
                label="Player"
                value={search}
                onChange={(e) => {
                  setSearch(e.currentTarget.value)
                  setOffset(0)
                }}
              />
              <Select
                label="Position"
                value={position}
                onChange={(v) => {
                  setPosition(v ?? '')
                  setOffset(0)
                }}
                data={['', 'QB', 'RB', 'WR', 'TE', 'K', 'D/ST']}
              />
              <Select
                label="Roster"
                value={owner}
                onChange={(v) => {
                  setOwner(v ?? '')
                  setOffset(0)
                }}
                data={[
                  { value: '', label: 'Everyone' },
                  { value: 'mine', label: 'My team' },
                  { value: 'free', label: 'Free agents' },
                  { value: 'rostered', label: 'Rostered' },
                ]}
              />
              <Checkbox
                label="Season totals"
                checked={totals}
                onChange={(e) => {
                  setTotals(e.currentTarget.checked)
                  setOffset(0)
                }}
              />
            </Group>
          </>
        ) : (
          <Text c="dimmed" size="sm">
            Official ESPN standings · season to date
          </Text>
        )}
        {query.error && <Alert color="red">{query.error.message}</Alert>}
        {query.isPending && Boolean(week && config.league_id) && (
          <SkeletonRegion label="Loading league data">
            <Stack>
              {/* Scoring and last-updated line */}
              <Skeleton height={18} width={240} />
              {/* Point cells stack a label over the value, so rows are taller than one line. */}
              <TableSkeleton columns={5} rows={12} headers={headers} rowMinHeight={74} />
            </Stack>
          </SkeletonRegion>
        )}
        {query.data && (
          <>
            <Text size="xs" c="dimmed">
              {query.data.scoring} · Updated {new Date(query.data.updated_at).toLocaleString()}
            </Text>
            {query.data.coverage && <Alert color="blue">{query.data.coverage}</Alert>}
            <Table.ScrollContainer minWidth={600}>
              <Table aria-busy={query.isPlaceholderData || undefined}>
                <Table.Thead>
                  <Table.Tr>
                    {headers.map((heading) => <Table.Th key={heading}>{heading}</Table.Th>)}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {query.data.items.map((row) => (
                    <Table.Tr
                      key={row.id}
                      bg={
                        row.id === config.team_id && view === 'standings'
                          ? 'var(--accent-bg)'
                          : undefined
                      }
                    >
                      <Table.Td>{row.rank}</Table.Td>
                      <Table.Td>{row.name}</Table.Td>
                      <Table.Td>
                        {view === 'standings'
                          ? `${row.wins}-${row.losses}-${row.ties}`
                          : `${row.position} · ${row.owner ?? 'Free agent'}`}
                      </Table.Td>
                      <Table.Td>
                        <ScoreValue value={row.points} />
                      </Table.Td>
                      <Table.Td>
                        {view === 'standings' ? (
                          row.points_against?.toFixed(1)
                        ) : (
                          <ScoreValue value={row.projected} projected />
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            {query.data.items.length === 0 && <Text>No players match this selection.</Text>}
            <Pager
              previousDisabled={!offset}
              nextDisabled={offset + 50 >= query.data.total}
              onPrevious={() => setOffset(Math.max(0, offset - 50))}
              onNext={() => setOffset(offset + 50)}
              summary={`${query.data.total} results`}
            />
          </>
        )}
      </Stack>
    </div>
  )
}
