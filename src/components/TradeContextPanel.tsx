import { useState } from 'react'
import { Alert, Button, Group, NativeSelect, SimpleGrid, Stack, Text } from '@mantine/core'
import type { DraftConfig } from '../api/types'
import { useSelectedWeek, validWeek } from '../hooks/useSelectedWeek'
import { useTradeContext } from '../hooks/useTradeContext'
import { SkeletonRegion, TextSkeleton } from './skeletons'
import { TradeContextRoster } from './TradeContextRoster'
import { contextNumber } from './tradeContextFormat'
import { TradeContextSchedule } from './TradeContextSchedule'

export function TradeContextPanel({ config }: { config: DraftConfig }) {
  const [week] = useSelectedWeek()
  const [horizon, setHorizon] = useState(4)
  const [selection, setSelection] = useState({ scope: '', teamId: '' })
  const scope = `${config.league_id}:${config.season}:${config.team_id}`
  const query = useTradeContext(config, week, horizon)
  const data = query.data
  const selectedId = selection.scope === scope ? selection.teamId : ''
  const counterparty = selectedId !== config.team_id ? data?.teams[selectedId] : undefined
  const ours = data?.teams[config.team_id]
  const metric = data?.strength_metric

  return (
    <section className="trade-builder" aria-label="League trade context">
      <Group justify="space-between">
        <h2>League trade context</h2>
        <Button variant="default" size="xs" loading={query.isFetching} disabled={!query.isEnabled}
          onClick={() => { void query.refetch() }}>Refresh context</Button>
      </Group>
      <Text size="sm" c="dimmed">Uses the trade builder's selected week: {validWeek(week) ?? 'select a week below'}.</Text>
      <NativeSelect label="Horizon" value={String(horizon)} w={200}
        data={Array.from({ length: 18 }, (_, i) => ({ value: String(i + 1), label: `${i + 1} scoring weeks` }))}
        onChange={(event) => setHorizon(Number(event.currentTarget.value))} />
      {!query.isEnabled && <Text>Select a valid league, season and week to load context.</Text>}
      {query.isEnabled && query.isPending && <SkeletonRegion label="Loading trade context"><TextSkeleton lines={5} /></SkeletonRegion>}
      {query.isError && <Alert color="red" mt="sm">
        Could not load trade context: {query.error.message}
        {data && ' Previously loaded context is shown below and may be out of date.'}
      </Alert>}
      {data && <Stack gap="md" mt="md">
        <Text>League {data.league_id} · Season {data.season} · As of week {data.as_of_week} · {data.end_week >= data.start_week ? `Weeks ${data.start_week}–${data.end_week}` : 'No regular-season weeks remaining'} · Requested horizon: {horizon} weeks · Regular season ends week {data.regular_season_end_week}</Text>
        <Text size="sm">Current roster source: {data.roster_snapshot.source} · Fetched <time dateTime={data.roster_snapshot.fetched_at}>{new Date(data.roster_snapshot.fetched_at).toLocaleString()}</time> · Observed ESPN week {data.roster_snapshot.observed_week}</Text>
        {!data.roster_snapshot.matches_as_of_week && <Alert color="yellow">Current ownership is shown; selecting a historical or future week does not reconstruct that week's roster.</Alert>}
        <Text size="sm">League coverage: {data.coverage.unmapped_espn_ids.length} unmapped ESPN players · {data.coverage.missing_metric_count} player-week entries missing VORP or projections.</Text>
        {metric && <Text size="sm">Fantasy strength source: {metric.source}. Completed fantasy points per scoring week, standardized as a z-score; positive means stronger. {metric.teams_with_strength}/{Object.keys(data.teams).length} teams with observed strength · League mean {contextNumber(metric.league_mean)} · Standard deviation {contextNumber(metric.league_stddev)}. Unknown values remain unknown. This describes past fantasy scoring, separate from NFL matchup difficulty; it is not a win probability.</Text>}
        {!ours && <Alert color="yellow">Configured team {config.team_id} is missing from this league context.</Alert>}
        <NativeSelect label="Counterparty" value={counterparty?.team_id ?? ''}
          data={[{ value: '', label: 'Select a counterparty' }, ...Object.values(data.teams).filter((team) => team.team_id !== config.team_id).map((team) => ({ value: team.team_id, label: team.name }))]}
          onChange={(event) => setSelection({ scope, teamId: event.currentTarget.value })} />
        {!Object.values(data.teams).some((team) => team.team_id !== config.team_id) && <Text>No counterparties available in this league context.</Text>}
        <SimpleGrid cols={{ base: 1, md: 2 }}>
          {ours && <TradeContextSchedule team={ours} otherTeamId={counterparty?.team_id} />}
          {counterparty && <TradeContextSchedule team={counterparty} otherTeamId={config.team_id} />}
        </SimpleGrid>
        {counterparty && <TradeContextRoster team={counterparty} week={data.as_of_week} />}
      </Stack>}
    </section>
  )
}
