import { Badge, Button, Group, Stack, Text } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { useTradeContextControls } from '../hooks/useTradeContextControls'
import { useTradeContext } from '../hooks/useTradeContext'
import { useOutgoingTradeOffers } from '../hooks/useOutgoingTradeOffers'
import { useSelectedWeek, validWeek } from '../hooks/useSelectedWeek'
import { useDraftConfig } from '../hooks/useDraftConfig'
import { byeOutlookQuery } from '../api/weekReads'
import { queryClient } from '../api/queryClient'
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
          actions={<Group gap="sm"><Button component={Link} to="/trades/sent" variant="default">Sent trades</Button><WeekSelector week={week} onChange={setWeek} /></Group>} />
        <Group gap="sm" aria-label="Trade summary">
          <Badge component="a" href="#approve" size="lg" variant="light">{offers.isError ? 'Approval count unavailable' : `${offers.data?.length ?? '…'} proposals awaiting your approval`}</Badge>
          <Badge component="a" href="#finder" size="lg" color="teal" variant="light">Proposable trades found: coming soon</Badge>
          <Badge size="lg" color="yellow" variant="light">{byes.data?.schedule_known ? byes.data.crunch_weeks.length ? `Bye crunch: weeks ${byes.data.crunch_weeks.join(', ')}` : 'No bye crunch ahead' : 'Bye outlook unavailable'}</Badge>
          <InfoTip label="a bye crunch">{tradeGlossary.byeCrunch}</InfoTip>
        </Group>
        <OutgoingTradeProposals config={config} linkedOfferKey={params.get('offer')} players={roster} week={selectedWeek ?? undefined} />
        <section id="finder" className="trade-builder" aria-labelledby="finder-title">
          <h2 id="finder-title">Trade finder</h2>
          <Text c="dimmed">Proposable trades across the league are coming soon. Build your own trade below to score a package now.</Text>
        </section>
        <details className="trade-section" id="builder">
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
