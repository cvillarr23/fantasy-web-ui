import { useCallback, useEffect, useRef, useState } from 'react'
import { Badge, Group, Stack } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useTradeContextControls } from '../hooks/useTradeContextControls'
import { useTradeContext } from '../hooks/useTradeContext'
import { useOutgoingTradeOffers } from '../hooks/useOutgoingTradeOffers'
import { useSelectedWeek, validWeek } from '../hooks/useSelectedWeek'
import { useDraftConfig } from '../hooks/useDraftConfig'
import { byeOutlookQuery } from '../api/weekReads'
import { queryClient } from '../api/queryClient'
import { TradeFinder } from './tradeFinder/TradeFinder'
import { TradeBuilder } from './TradeBuilder'
import { TradeContextPanel } from './TradeContextPanel'
import { OutgoingTradeProposals } from './OutgoingTradeProposals'
import { PageSkeleton } from './skeletons'
import { LeagueNotConfigured } from './ui/LeagueNotConfigured'
import { PageHeader } from './ui/PageHeader'
import { WeekSelector } from './ui/WeekSelector'
import { InfoTip } from './ui/InfoTip'
import { tradeGlossary } from './tradeScore/tradeGlossary'

export function TradePage() {
  const { config, loading: configLoading } = useDraftConfig()
  const tradeContextControls = useTradeContextControls(config)
  const [params] = useSearchParams()
  const [week, setWeek] = useSelectedWeek()
  const selectedWeek = validWeek(week)
  const context = useTradeContext(config, week, tradeContextControls.horizon)
  const offers = useOutgoingTradeOffers(config)
  const byes = useQuery(byeOutlookQuery(config, selectedWeek ?? 0), queryClient)
  const finderScope = `${config.league_id}:${config.team_id}:${config.season}:${selectedWeek}`
  const [finderCount, setFinderCount] = useState<{ scope: string; count: number | null } | null>(null)
  const reportFinderCount = useCallback((count: number | null) => setFinderCount({ scope: finderScope, count }), [finderScope])
  const builderRef = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    if (!tradeContextControls.builderDraft || !builderRef.current) return
    builderRef.current.open = true
    const frame = requestAnimationFrame(() => builderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    return () => cancelAnimationFrame(frame)
  }, [tradeContextControls.builderDraft])
  const proposableCount = finderCount?.scope === finderScope ? finderCount.count : null
  const isConfigured = Boolean(config.league_id && config.team_id)

  if (!isConfigured) {
    if (configLoading) return <PageSkeleton />
    return <LeagueNotConfigured />
  }
  const roster = Object.values(context.data?.teams ?? {}).flatMap(team => team.roster)
  return (
    <div className="dashboard trades-page">
      <Stack gap="xl">
        <PageHeader title="Trades" level={1} subtitle={`Week ${selectedWeek ?? '—'} · scored over the next ${tradeContextControls.horizon} weeks`}
          actions={<WeekSelector week={week} onChange={setWeek} />} />
        <Group gap="sm" aria-label="Trade summary">
          <Badge component="a" href="#approve" size="lg" variant="light">{offers.isError ? 'Approval count unavailable' : `${offers.data?.length ?? '…'} proposals awaiting your approval`}</Badge>
          <Badge component="a" href="#finder" size="lg" color="teal" variant="light">{proposableCount == null ? 'Proposable count unavailable' : `${proposableCount} proposable trades found`}</Badge>
          <Badge size="lg" color="yellow" variant="light">{byes.data?.schedule_known ? byes.data.crunch_weeks.length ? `Bye crunch: weeks ${byes.data.crunch_weeks.join(', ')}` : 'No bye crunch ahead' : 'Bye outlook unavailable'}</Badge>
          <InfoTip label="a bye crunch">{tradeGlossary.byeCrunch}</InfoTip>
        </Group>
        <OutgoingTradeProposals config={config} linkedOfferKey={params.get('offer')} players={roster} week={selectedWeek ?? undefined} />
        <TradeFinder config={config} week={selectedWeek ?? 0} controls={tradeContextControls} onProposableCountChange={reportFinderCount} />
        <details className="trade-section" id="builder" ref={builderRef}>
          <summary>Build your own</summary>
          <TradeBuilder config={config} controls={tradeContextControls} hideWeekSelector />
        </details>
        <details className="trade-section">
          <summary>League context</summary>
          <TradeContextPanel config={config} controls={tradeContextControls} />
        </details>
      </Stack>
    </div>
  )
}
