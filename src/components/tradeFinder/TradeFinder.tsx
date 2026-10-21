import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useDebouncedValue, useInterval } from '@mantine/hooks'
import { NativeSelect, Skeleton, Stack, Text } from '@mantine/core'
import { ApiError, getRosterDeficits, getTradeCandidates } from '../../api/client'
import { queryClient } from '../../api/queryClient'
import type { DraftConfig } from '../../api/types'
import type { TradeCandidateParams } from '../../api/tradeCandidateTypes'
import type { TradeContextControls } from '../../hooks/useTradeContextControls'
import { useTradeContext } from '../../hooks/useTradeContext'
import { InfoTip } from '../ui/InfoTip'
import { ErrorAlert } from '../ui/ErrorAlert'
import { Pager } from '../ui/Pager'
import { tradeGlossary } from '../tradeScore/tradeGlossary'
import { TradeFinderTeamCards } from './TradeFinderTeamCards'
import { TradeCandidateHeaders, TradeCandidateRow } from './TradeCandidateRow'
import { TradeCandidateDetails } from './TradeCandidateDetails'
import './tradeFinder.css'

export const TRADE_CANDIDATE_PAGE_SIZE = 25
interface Props {
  config: DraftConfig
  week: number
  controls?: TradeContextControls
  onProposableCountChange?: (count: number | null) => void
}
type Filters = Pick<TradeCandidateParams, 'counterparty_team_id' | 'receive_position' | 'send_position' | 'shape' | 'status' | 'sort'>
const defaultFilters: Filters = { counterparty_team_id: '', receive_position: '', send_position: '', shape: '', status: 'proposable', sort: 'final_score' }
const positions = [{ value: '', label: 'Any position' }, ...['QB', 'RB', 'WR', 'TE', 'K', 'D/ST']]

function computedAge(computedAt: string, now: number) {
  const elapsed = now - Date.parse(computedAt)
  if (!Number.isFinite(elapsed)) return { label: 'time unavailable', stale: true }
  const minutes = Math.max(0, Math.floor(elapsed / 60000))
  return { label: minutes < 1 ? 'just now' : minutes < 60 ? `${minutes} minutes ago` : minutes < 1440 ? `${Math.floor(minutes / 60)} hours ago` : `${Math.floor(minutes / 1440)} days ago`, stale: elapsed > 36 * 3600000 }
}

/** A new scope gets a fresh observer: previous rows can only bridge filters within a week. */
export function TradeFinder(props: Props) {
  return <ScopedTradeFinder key={`${props.config.league_id}:${props.config.team_id}:${props.config.season}:${props.week}`} {...props} />
}
function ScopedTradeFinder({ config, week, controls, onProposableCountChange }: Props) {
  const [browse, setBrowse] = useState({ filters: defaultFilters, offset: 0 })
  const [settled] = useDebouncedValue(browse, 300)
  const [selection, setSelection] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now)
  const { start, stop } = useInterval(() => setNow(Date.now()), 60_000)
  useEffect(() => { start(); return stop }, [start, stop])
  const valid = Number.isInteger(week) && week >= 1 && week <= 18 && Boolean(config.league_id && config.team_id)
  const query = useQuery({
    queryKey: ['trade-candidates', config.league_id, config.team_id, config.season, week, settled],
    queryFn: ({ signal }) => getTradeCandidates({ league_id: config.league_id, season: config.season, week, ...settled.filters, limit: TRADE_CANDIDATE_PAGE_SIZE, offset: settled.offset }, signal),
    enabled: valid, placeholderData: keepPreviousData,
  }, queryClient)
  const data = query.data
  const context = useTradeContext(config, week, data?.horizon ?? 4)
  const deficits = useQuery({ queryKey: ['roster-deficits', config.league_id, config.team_id, config.season, week], queryFn: () => getRosterDeficits(config.season, week), enabled: valid }, queryClient)
  const busy = browse !== settled || query.isPlaceholderData
  const selected = !busy && !query.error ? data?.items.find((c) => c.candidate_key === selection) : undefined
  const count = !query.error && data ? data.team_counts.reduce((n, team) => n + team.proposable, 0) : null
  useEffect(() => { onProposableCountChange?.(count) }, [count, onProposableCountChange])
  const change = (key: keyof Filters, value: string) => {
    setSelection(null)
    setBrowse((current) => ({ filters: { ...current.filters, [key]: value }, offset: 0 }))
  }
  const age = data && computedAge(data.computed_at, now)
  const missingRun = query.error instanceof ApiError && query.error.status === 404
  const teamIds = new Map(data?.team_counts.map((t) => [t.team_id, t.name]))
  for (const team of Object.values(context.data?.teams ?? {})) if (team.team_id !== config.team_id) teamIds.set(team.team_id, team.name)
  return <section id="finder" aria-labelledby="trade-finder-heading" className="trade-finder">
    <div className="finder-heading"><div><h2 id="trade-finder-heading">Trade finder</h2><Text size="sm" c="dimmed">Every scored 1-for-1, 2-for-1 and 1-for-2 we could offer. Pick a team or a position to narrow it.</Text></div>
      {data && !query.error && <Text size="xs" c="dimmed">Computed <time dateTime={data.computed_at} title={data.computed_at}>{age?.label}</time></Text>}
    </div>
    {age?.stale && !query.error && <Text size="sm" className="finder-stale">Snapshot older than 36 hours. Re-score in the builder before acting.</Text>}
    {data && !query.error && <TradeFinderTeamCards counts={data.team_counts} context={context.data} deficits={deficits.data} ourTeamId={config.team_id} selectedTeamId={browse.filters.counterparty_team_id ?? ''} onSelect={(id) => change('counterparty_team_id', id)} />}
    <div className="finder-filters">
      <NativeSelect label="Team" value={browse.filters.counterparty_team_id} data={[{ value: '', label: 'All teams' }, ...[...teamIds].map(([value, label]) => ({ value, label }))]} onChange={(e) => change('counterparty_team_id', e.currentTarget.value)} />
      <NativeSelect label="I get" value={browse.filters.receive_position} data={positions} onChange={(e) => change('receive_position', e.currentTarget.value)} />
      <NativeSelect label="I give" value={browse.filters.send_position} data={positions} onChange={(e) => change('send_position', e.currentTarget.value)} />
      <NativeSelect label="Shape" value={browse.filters.shape} data={[{ value: '', label: 'Any' }, { value: '1for1', label: '1-for-1' }, { value: '2for1', label: '2-for-1 (give 2)' }, { value: '1for2', label: '1-for-2 (get 2)' }]} onChange={(e) => change('shape', e.currentTarget.value)} />
      <div className="finder-status-filter"><NativeSelect label="Status" value={browse.filters.status} data={[{ value: 'proposable', label: 'Proposable' }, { value: 'needs_drop', label: 'Needs a drop' }, { value: 'all', label: 'Show all' }]} onChange={(e) => change('status', e.currentTarget.value)} /><InfoTip label="trade statuses">{tradeGlossary.statuses}</InfoTip></div>
      <NativeSelect label="Sort by" value={browse.filters.sort} data={[{ value: 'final_score', label: 'Final score' }, { value: 'our_gain', label: 'Our gain' }, { value: 'their_benefit', label: 'Their benefit (lineup change)' }]} onChange={(e) => change('sort', e.currentTarget.value)} />
    </div>
    {!valid ? <Text size="sm">Select a valid week to browse candidate trades.</Text> : query.error ? missingRun ? <Text size="sm">The trade-candidates job has not run for week {week} yet. Candidates will appear after the next scheduled computation.</Text> : <ErrorAlert onRetry={() => void query.refetch()}>{query.error.message}</ErrorAlert> : <div className="finder-content">
      <div className="finder-list" aria-busy={busy || query.isLoading}>
        <div role="table" aria-label="Candidate trades" className={busy ? 'finder-updating' : undefined}>
          <TradeCandidateHeaders />
          <div role="rowgroup">{query.isLoading ? <Stack gap="xs" role="status" aria-label="Loading candidate trades">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} height={96} />)}</Stack> : data?.items.map((candidate) => <TradeCandidateRow key={candidate.candidate_key} candidate={candidate} config={config} week={week} horizon={data.horizon} runId={data.run_id} selected={selected?.candidate_key === candidate.candidate_key} onSelect={() => setSelection(candidate.candidate_key)} />)}</div>
        </div>
        {data?.items.length === 0 && <Text size="sm" className="finder-empty">No trades match these filters. Try Any position or show trades that need a drop.</Text>}
        {data && data.total > 0 && <Pager buttonVariant="default" previousDisabled={busy || settled.offset === 0} nextDisabled={busy || settled.offset + TRADE_CANDIDATE_PAGE_SIZE >= data.total}
          onPrevious={() => { setSelection(null); setBrowse((current) => ({ ...current, offset: Math.max(0, current.offset - TRADE_CANDIDATE_PAGE_SIZE) })) }}
          onNext={() => { setSelection(null); setBrowse((current) => ({ ...current, offset: current.offset + TRADE_CANDIDATE_PAGE_SIZE })) }}
          summary={<>{settled.offset + 1}–{Math.min(settled.offset + data.items.length, data.total)} of {data.total} scored trades</>} />}
        <Text size="xs" c="dimmed">Hover or tap a gain to see it week by week. Open a trade in the builder to re-score it live.</Text>
      </div>
      {selected && data && <TradeCandidateDetails key={selected.candidate_key} candidate={selected} config={config} week={week} horizon={data.horizon} runId={data.run_id} context={context.data} deficits={deficits.data}
        onOpenBuilder={controls?.prefillTrade ? () => controls.prefillTrade!({ candidate: selected, week, horizon: data.horizon }) : undefined} />}
    </div>}
  </section>
}
