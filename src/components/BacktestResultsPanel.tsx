import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryClient } from '../api/queryClient'
import { BarChart, LineChart } from '@mantine/charts'
import { Alert, Select, Skeleton, Stack, Text, Title } from '@mantine/core'
import { getBacktestResultDetail, getBacktestResults } from '../api/client'
import { ChartSkeleton, SkeletonRegion } from './skeletons'

const CHART_HEIGHT = 280

// Three titled charts, matching the loaded layout below.
function BacktestChartsSkeleton() {
  return (
    <SkeletonRegion label="Loading backtest results">
      <Stack gap="xl">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i}>
            <Skeleton height={20} width="55%" mb="xs" />
            <ChartSkeleton height={CHART_HEIGHT} />
          </div>
        ))}
      </Stack>
    </SkeletonRegion>
  )
}

export function BacktestResultsPanel() {
  const runsQuery = useQuery({ queryKey: ['backtest-runs'], queryFn: getBacktestResults }, queryClient)
  const runs = runsQuery.data ?? null
  const [selectedSeason, setSeason] = useState<string | null>(null)
  // Default to the newest run until the user picks one.
  const season = selectedSeason ?? (runs?.[0] ? String(runs[0].season) : null)
  const detailQuery = useQuery({
    queryKey: ['backtest-detail', season],
    queryFn: () => getBacktestResultDetail(Number(season)),
    enabled: Boolean(season),
    placeholderData: keepPreviousData,
  }, queryClient)
  const detail = detailQuery.data ?? null
  const error = detailQuery.error ? String(detailQuery.error) : null

  if (runsQuery.isPending) {
    return (
      <section className="backtest-results-panel" aria-label="Backtest results">
        <Skeleton height={14} width={50} mb={6} />
        <Skeleton height={36} width={140} radius="sm" mb="md" />
        <BacktestChartsSkeleton />
      </section>
    )
  }
  if (runsQuery.error) return <Alert color="red">{String(runsQuery.error)}</Alert>
  if (!runs || runs.length === 0) {
    return <Text c="dimmed" size="sm">No backtest runs available yet.</Text>
  }

  const weeklyData = detail?.summary_json.weeks.map((w) => ({
    week: `Week ${w.week}`,
    Ours: w.our_lineup_points,
    'Hindsight optimal': w.optimal_lineup_points,
    'Naive baseline': w.naive_baseline_points,
  })) ?? []

  const waiverData = detail?.summary_json.weeks.map((w) => ({
    week: `Week ${w.week}`,
    Ours: w.our_waiver_points,
    'No moves': w.no_moves_points,
  })) ?? []

  const draftData = detail
    ? [{ category: 'Season points', Ours: detail.our_draft_points, 'Pure ADP': detail.pure_adp_draft_points }]
    : []

  return (
    <section className="backtest-results-panel" aria-label="Backtest results">
      <Select
        label="Season"
        data={runs.map((run) => ({ value: String(run.season), label: String(run.season) }))}
        value={season}
        onChange={setSeason}
        w={140}
        mb="md"
      />
      {error && <Alert color="red" mb="md">{error}</Alert>}
      {detailQuery.isLoading && <BacktestChartsSkeleton />}
      {detail && (
        <Stack gap="xl" aria-busy={detailQuery.isPlaceholderData || undefined}>
          <div>
            <Title order={4} mb="xs">Weekly lineup: ours vs. hindsight-optimal vs. naive baseline</Title>
            <LineChart
              h={CHART_HEIGHT}
              data={weeklyData}
              dataKey="week"
              series={[
                { name: 'Ours', color: 'blue.6' },
                { name: 'Hindsight optimal', color: 'green.6' },
                { name: 'Naive baseline', color: 'gray.6' },
              ]}
              curveType="monotone"
              withLegend
            />
          </div>
          <div>
            <Title order={4} mb="xs">Waiver: ours vs. static no-moves roster</Title>
            <LineChart
              h={CHART_HEIGHT}
              data={waiverData}
              dataKey="week"
              series={[
                { name: 'Ours', color: 'blue.6' },
                { name: 'No moves', color: 'gray.6' },
              ]}
              curveType="monotone"
              withLegend
            />
          </div>
          <div>
            <Title order={4} mb="xs">Draft: our roster's season points vs. pure-ADP-drafted roster</Title>
            <BarChart
              h={CHART_HEIGHT}
              data={draftData}
              dataKey="category"
              series={[
                { name: 'Ours', color: 'blue.6' },
                { name: 'Pure ADP', color: 'gray.6' },
              ]}
              withLegend
            />
          </div>
        </Stack>
      )}
    </section>
  )
}
