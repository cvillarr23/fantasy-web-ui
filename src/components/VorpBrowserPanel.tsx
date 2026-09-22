import { useEffect, useState } from 'react'
import { Alert, Group, Select, Skeleton, Table, Text } from '@mantine/core'
import { getVorpStats } from '../api/client'
import type { VorpStat } from '../api/types'

const POSITION_OPTIONS = ['All', 'QB', 'RB', 'WR', 'TE', 'K', 'D/ST']
const SORT_OPTIONS = [
  { value: 'vorp', label: 'VORP' },
  { value: 'projected_points', label: 'Projected points' },
  { value: 'actual_points', label: 'Actual points' },
  { value: 'week', label: 'Week' },
] as const
type SortValue = (typeof SORT_OPTIONS)[number]['value']

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
  const [week, setWeek] = useState('All weeks')
  const [position, setPosition] = useState('All')
  const [sort, setSort] = useState<SortValue>('vorp')
  const [weekRows, setWeekRows] = useState<VorpStat[] | null>(null)
  const [seasonRows, setSeasonRows] = useState<SeasonTotalRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const positionFilter = position === 'All' ? undefined : position
  const selectedWeek = week === 'All weeks' ? undefined : Number(week)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setWeekRows(null)
    setSeasonRows(null)

    if (selectedWeek !== undefined) {
      getVorpStats({ season, week: selectedWeek, position: positionFilter, sort, limit: 1000 })
        .then((rows) => { if (!cancelled) setWeekRows(rows) })
        .catch((err) => { if (!cancelled) setError(String(err)) })
        .finally(() => { if (!cancelled) setLoading(false) })
    } else {
      // The API caps at 1000 rows/call, which a full season's player pool can exceed - fetch
      // per-week and sum client-side instead. allSettled (not all/catch-per-request) so one
      // bad week doesn't erase the rest, but a total outage still surfaces as an error.
      const weekNumbers = Array.from({ length: MAX_WEEK }, (_, i) => i + 1)
      Promise.allSettled(
        weekNumbers.map((w) => getVorpStats({ season, week: w, position: positionFilter, limit: 1000 })),
      ).then((results) => {
        if (cancelled) return
        const fulfilled = results.filter((r): r is PromiseFulfilledResult<VorpStat[]> => r.status === 'fulfilled')
        if (fulfilled.length === 0 && results.length > 0) {
          const firstFailure = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')
          setError(String(firstFailure?.reason))
          setLoading(false)
          return
        }
        setSeasonRows(aggregateSeasonTotals(fulfilled.map((r) => r.value)))
        setLoading(false)
      })
    }

    return () => { cancelled = true }
  }, [season, selectedWeek, positionFilter, sort])

  const weekEmpty = selectedWeek !== undefined && weekRows?.length === 0
  const seasonEmpty = selectedWeek === undefined && seasonRows?.length === 0

  return (
    <section className="vorp-browser-panel" aria-label="Season VORP browser">
      <Group gap="md" mb="md">
        <Select label="Week" data={WEEK_OPTIONS} value={week} onChange={(value) => setWeek(value ?? 'All weeks')} w={140} />
        <Select label="Position" data={POSITION_OPTIONS} value={position} onChange={(value) => setPosition(value ?? 'All')} w={140} />
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
        <Table>
          <Table.Tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <Table.Tr key={i}><Table.Td><Skeleton height={12} /></Table.Td></Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
      {!loading && selectedWeek !== undefined && weekRows && weekRows.length > 0 && (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Player</Table.Th>
              <Table.Th>Pos</Table.Th>
              <Table.Th>Team</Table.Th>
              <Table.Th>Projected</Table.Th>
              <Table.Th>Actual</Table.Th>
              <Table.Th>VORP</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {weekRows.map((row) => (
              <Table.Tr key={`${row.player_id}-${row.week}`}>
                <Table.Td>{row.name}</Table.Td>
                <Table.Td>{row.position}</Table.Td>
                <Table.Td>{row.team ?? '—'}</Table.Td>
                <Table.Td>{row.projected_points?.toFixed(1) ?? '—'}</Table.Td>
                <Table.Td>{row.actual_points?.toFixed(1) ?? '—'}</Table.Td>
                <Table.Td>{row.vorp_score?.toFixed(1) ?? '—'}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
      {!loading && selectedWeek === undefined && seasonRows && seasonRows.length > 0 && (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Player</Table.Th>
              <Table.Th>Pos</Table.Th>
              <Table.Th>Team</Table.Th>
              <Table.Th>Weeks</Table.Th>
              <Table.Th>Season VORP</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {seasonRows.map((row) => (
              <Table.Tr key={row.player_id}>
                <Table.Td>{row.name}</Table.Td>
                <Table.Td>{row.position}</Table.Td>
                <Table.Td>{row.team ?? '—'}</Table.Td>
                <Table.Td>{row.weeksPlayed}</Table.Td>
                <Table.Td>{row.totalVorp.toFixed(1)}</Table.Td>
              </Table.Tr>
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
