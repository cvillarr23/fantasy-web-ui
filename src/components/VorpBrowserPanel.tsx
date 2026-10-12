import { useSelectedWeek } from '../hooks/useSelectedWeek'
import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryClient } from '../api/queryClient'
import { Alert, Group, Select, Table, Text } from '@mantine/core'
import { getVorpStats } from '../api/client'
import { PlayerCard } from './player/PlayerCard'
import { SkeletonRegion, TableRowsSkeleton } from './skeletons'
import type { VorpStat } from '../api/types'
import { formatNumber } from './ui/formatNumber'

const POSITION_OPTIONS = ['All', 'QB', 'RB', 'WR', 'TE', 'K', 'D/ST']
const SORT_OPTIONS = [
  { value: 'vorp', label: 'VORP' },
  { value: 'projected_points', label: 'Projected points' },
  { value: 'actual_points', label: 'Actual points' },
  { value: 'week', label: 'Week' },
] as const
type SortValue = (typeof SORT_OPTIONS)[number]['value']

const WEEK_COLUMNS = ['Player', 'Pos', 'Team', 'Projected', 'Actual', 'VORP']
const SEASON_COLUMNS = ['Player', 'Pos', 'Team', 'Weeks', 'Season VORP']

const MAX_WEEK = 18
const WEEK_OPTIONS = ['All weeks', ...Array.from({ length: MAX_WEEK }, (_, i) => String(i + 1))]

interface SeasonTotalRow {
  player_id: string
  name: string
  position: string
  team: string | null
  totalVorp: number
  weeksPlayed: number
}

// The API caps at 1000 rows/call, which a full season's player pool can exceed - fetch per-week
// and sum client-side instead. allSettled (not all/catch-per-request) so one bad week doesn't
// erase the rest, but a total outage still surfaces as an error.
async function fetchSeasonTotals(season: number, position: string | undefined): Promise<SeasonTotalRow[]> {
  const weekNumbers = Array.from({ length: MAX_WEEK }, (_, i) => i + 1)
  const results = await Promise.allSettled(
    weekNumbers.map((w) => getVorpStats({ season, week: w, position, limit: 1000 })),
  )
  const fulfilled = results.filter((r): r is PromiseFulfilledResult<VorpStat[]> => r.status === 'fulfilled')
  if (fulfilled.length === 0 && results.length > 0) {
    const firstFailure = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')
    throw firstFailure?.reason
  }
  return aggregateSeasonTotals(fulfilled.map((r) => r.value))
}

function aggregateSeasonTotals(weeks: VorpStat[][]): SeasonTotalRow[] {
  const totals = new Map<string, SeasonTotalRow>()
  for (const rows of weeks) {
    for (const row of rows) {
      const vorp = row.vorp_score ?? 0
      const existing = totals.get(row.player_id)
      if (existing) {
        existing.totalVorp += vorp
        existing.weeksPlayed += 1
      } else {
        totals.set(row.player_id, {
          player_id: row.player_id,
          name: row.name,
          position: row.position,
          team: row.team,
          totalVorp: vorp,
          weeksPlayed: 1,
        })
      }
    }
  }
  return [...totals.values()].sort((a, b) => b.totalVorp - a.totalVorp)
}

interface Props {
  season: number
}

export function VorpBrowserPanel({ season }: Props) {
  const [selected, setSelected] = useSelectedWeek()
  const [allWeeks, setAllWeeks] = useState(false)
  const week = allWeeks ? 'All weeks' : String(selected)
  const [position, setPosition] = useState('All')
  const [sort, setSort] = useState<SortValue>('vorp')

  const positionFilter = position === 'All' ? undefined : position
  const selectedWeek = week === 'All weeks' ? undefined : Number(week)

  // Filters keep the current table up (dimmed) while the next selection loads.
  const weekQuery = useQuery({
    queryKey: ['vorp-week', season, selectedWeek, positionFilter, sort],
    queryFn: () => getVorpStats({ season, week: selectedWeek, position: positionFilter, sort, limit: 1000 }),
    enabled: selectedWeek !== undefined && Boolean(selected),
    placeholderData: keepPreviousData,
  }, queryClient)
  const seasonQuery = useQuery({
    queryKey: ['vorp-season', season, positionFilter],
    queryFn: () => fetchSeasonTotals(season, positionFilter),
    enabled: selectedWeek === undefined,
    placeholderData: keepPreviousData,
  }, queryClient)
  const activeQuery = selectedWeek === undefined ? seasonQuery : weekQuery
  const weekRows = weekQuery.data ?? null
  const seasonRows = seasonQuery.data ?? null
  const loading = activeQuery.isLoading
  const error = activeQuery.error ? String(activeQuery.error) : null
  const updating = activeQuery.isPlaceholderData
  const columns = selectedWeek === undefined ? SEASON_COLUMNS : WEEK_COLUMNS

  const weekEmpty = selectedWeek !== undefined && weekRows?.length === 0
  const seasonEmpty = selectedWeek === undefined && seasonRows?.length === 0

  return (
    <section className="vorp-browser-panel" aria-label="Season VORP browser">
      <Group gap="md" mb="md">
        <Select
          label="Week"
          data={WEEK_OPTIONS}
          value={week}
          onChange={(value) => {
            setAllWeeks(value === 'All weeks')
            if (value !== 'All weeks' && value) setSelected(Number(value))
          }}
          w={140}
        />
        <Select
          label="Position"
          data={POSITION_OPTIONS}
          value={position}
          onChange={(value) => setPosition(value ?? 'All')}
          w={140}
        />
        {selectedWeek !== undefined && (
          <Select
            label="Sort by"
            data={SORT_OPTIONS as unknown as { value: string; label: string }[]}
            value={sort}
            onChange={(value) => setSort((value as SortValue) ?? 'vorp')}
            w={180}
          />
        )}
      </Group>
      {error && <Alert color="red" mb="md">{error}</Alert>}
      {loading && (
        <SkeletonRegion label="Loading VORP data">
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                {columns.map((heading) => <Table.Th key={heading}>{heading}</Table.Th>)}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <TableRowsSkeleton columns={columns.length} rows={12} />
            </Table.Tbody>
          </Table>
        </SkeletonRegion>
      )}
      {!loading && selectedWeek !== undefined && weekRows && weekRows.length > 0 && (
        <Table striped highlightOnHover aria-busy={updating || undefined}>
          <Table.Thead>
            <Table.Tr>
              {WEEK_COLUMNS.map((heading) => <Table.Th key={heading}>{heading}</Table.Th>)}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {weekRows.map((row) => (
              <PlayerCard
                key={`${row.player_id}-${row.week}`}
                variant="tableRow"
                player={{ id: row.player_id, name: row.name, position: row.position }}
                columns={[
                  row.team ?? '—',
                  formatNumber(row.projected_points),
                  formatNumber(row.actual_points),
                  formatNumber(row.vorp_score),
                ]}
              />
            ))}
          </Table.Tbody>
        </Table>
      )}
      {!loading && selectedWeek === undefined && seasonRows && seasonRows.length > 0 && (
        <Table striped highlightOnHover aria-busy={updating || undefined}>
          <Table.Thead>
            <Table.Tr>
              {SEASON_COLUMNS.map((heading) => <Table.Th key={heading}>{heading}</Table.Th>)}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {seasonRows.map((row) => (
              <PlayerCard
                key={row.player_id}
                variant="tableRow"
                player={{ id: row.player_id, name: row.name, position: row.position }}
                columns={[row.team ?? '—', row.weeksPlayed, row.totalVorp.toFixed(1)]}
              />
            ))}
          </Table.Tbody>
        </Table>
      )}
      {!loading && !error && (weekEmpty || seasonEmpty) && (
        <Text c="dimmed" size="sm">No VORP data for this selection.</Text>
      )}
    </section>
  )
}
