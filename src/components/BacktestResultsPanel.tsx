import { useEffect, useState } from 'react'
import { BarChart, LineChart } from '@mantine/charts'
import { Alert, Select, Skeleton, Stack, Text, Title } from '@mantine/core'
import { getBacktestResultDetail, getBacktestResults } from '../api/client'
import type { BacktestResultDetail, BacktestResultSummary } from '../api/types'

export function BacktestResultsPanel() {
  const [runs, setRuns] = useState<BacktestResultSummary[] | null>(null)
  const [season, setSeason] = useState<string | null>(null)
  const [detail, setDetail] = useState<BacktestResultDetail | null>(null)
  const [loadingRuns, setLoadingRuns] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getBacktestResults()
      .then((rows) => {
        if (cancelled) return
        setRuns(rows)
        if (rows.length > 0) setSeason(String(rows[0].season))
      })
      .catch((err) => { if (!cancelled) setError(String(err)) })
      .finally(() => { if (!cancelled) setLoadingRuns(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!season) return
    let cancelled = false
    setLoadingDetail(true)
    setError(null)
    setDetail(null)
    getBacktestResultDetail(Number(season))
      .then((response) => { if (!cancelled) setDetail(response) })
      .catch((err) => { if (!cancelled) setError(String(err)) })
      .finally(() => { if (!cancelled) setLoadingDetail(false) })
    return () => { cancelled = true }
  }, [season])

  if (loadingRuns) return <Skeleton height={300} />
  if (error && !runs) return <Alert color="red">{error}</Alert>
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
      {loadingDetail && <Skeleton height={300} />}
      {!loadingDetail && detail && (
        <Stack gap="xl">
          <div>
            <Title order={4} mb="xs">Weekly lineup: ours vs. hindsight-optimal vs. naive baseline</Title>
            <LineChart
              h={280}
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
              h={280}
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
              h={280}
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
