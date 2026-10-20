import { InfoTip } from './ui/InfoTip'
import { tradeGlossary } from './tradeScore/tradeGlossary'
import { Alert, Button, Group, NativeSelect, SimpleGrid, Stack, Text } from '@mantine/core'
import type { DraftConfig } from '../api/types'
import { useSelectedWeek, validWeek } from '../hooks/useSelectedWeek'
import { useTradeContext } from '../hooks/useTradeContext'
import { SkeletonRegion, TextSkeleton } from './skeletons'
import { TradeContextRoster } from './TradeContextRoster'
import { contextNumber } from './tradeContextFormat'
import { TradeContextSchedule } from './TradeContextSchedule'
import { TradeContextProvenance } from './TradeContextProvenance'
import type { TradeContextControls } from '../hooks/useTradeContextControls'

export function TradeContextPanel({ config, controls }: { config: DraftConfig; controls: TradeContextControls }) {
  const [week] = useSelectedWeek()
  const { horizon, onHorizonChange, counterpartyTeamId, onCounterpartyTeamChange } = controls
  const query = useTradeContext(config, week, horizon)
  const data = query.data
  const counterparty = counterpartyTeamId !== config.team_id ? data?.teams[counterpartyTeamId] : undefined
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
      <Group align="end" gap="xs">
        <NativeSelect label="Horizon" value={String(horizon)} w={200}
          data={Array.from({ length: 18 }, (_, i) => ({ value: String(i + 1), label: `${i + 1} scoring weeks` }))}
          onChange={(event) => onHorizonChange(Number(event.currentTarget.value))} />
        <InfoTip label="the horizon">{tradeGlossary.horizon}</InfoTip>
      </Group>
      {!query.isEnabled && <Text>Select a valid league, season and week to load context.</Text>}
      {query.isEnabled && query.isPending && <SkeletonRegion label="Loading trade context"><TextSkeleton lines={5} /></SkeletonRegion>}
      {query.isError && <Alert color="red" mt="sm">
        Could not load trade context: {query.error.message}
        {data && ' Previously loaded context is shown below and may be out of date.'}
      </Alert>}
      {data && <Stack gap="md" mt="md">
        <dl className="trade-context-metadata" aria-label="League context metadata">
          <div><dt>League</dt><dd>{data.league_id}</dd></div>
          <div><dt>Season</dt><dd>{data.season}</dd></div>
          <div><dt>As of week</dt><dd>{data.as_of_week}</dd></div>
          <div><dt>Horizon</dt><dd>{data.end_week >= data.start_week ? `Weeks ${data.start_week}–${data.end_week}` : 'No regular-season weeks remaining'} ({horizon} requested)</dd></div>
          <div><dt>Regular season ends</dt><dd>Week {data.regular_season_end_week}</dd></div>
          <div><dt>Unmapped players</dt><dd>{data.coverage.unmapped_espn_ids.length}</dd></div>
          <div><dt>Missing player-week metrics</dt><dd>{data.coverage.missing_metric_count}</dd></div>
          {metric && <>
            <div><dt>Observed strength <InfoTip label="strength">{tradeGlossary.strength}</InfoTip></dt><dd>{metric.teams_with_strength}/{Object.keys(data.teams).length} teams</dd></div>
            <div><dt>Strength source</dt><dd>{metric.source}</dd></div>
            <div><dt>League mean</dt><dd>{contextNumber(metric.league_mean)}</dd></div>
            <div><dt>Standard deviation</dt><dd>{contextNumber(metric.league_stddev)}</dd></div>
          </>}
        </dl>
        <TradeContextProvenance snapshot={data.roster_snapshot} />
        {!ours && <Alert color="yellow">Configured team {config.team_id} is missing from this league context.</Alert>}
        <NativeSelect label="Counterparty" value={counterparty?.team_id ?? ''}
          data={[{ value: '', label: 'Select a counterparty' }, ...Object.values(data.teams).filter((team) => team.team_id !== config.team_id).map((team) => ({ value: team.team_id, label: team.name }))]}
          onChange={(event) => onCounterpartyTeamChange(event.currentTarget.value)} />
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
