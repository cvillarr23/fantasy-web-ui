import { useQuery } from '@tanstack/react-query'
import { Button } from '@mantine/core'
import { Link } from 'react-router-dom'
import { getTeamNames } from '../../api/client'
import { queryClient } from '../../api/queryClient'
import { getSentTradeOffers, sentTradeHistory } from '../../api/sentTrades'
import { useDraftConfig } from '../../hooks/useDraftConfig'
import { useCurrentWeek } from '../../hooks/useCurrentWeek'
import { PageSkeleton, SkeletonRegion, TableSkeleton } from '../skeletons'
import { ErrorAlert } from '../ui/ErrorAlert'
import { LeagueNotConfigured } from '../ui/LeagueNotConfigured'
import { PageHeader } from '../ui/PageHeader'
import { SentTradesReview } from './SentTradesReview'

export function SentTradesPage() {
  const { config, loading } = useDraftConfig()
  const week = useCurrentWeek()
  const configured = !!(config.league_id && config.team_id)
  const offers = useQuery({
    queryKey: ['sent-trades', config.league_id, config.team_id, config.season],
    queryFn: () => getSentTradeOffers(config), enabled: configured, staleTime: 30_000,
  }, queryClient)
  const names = useQuery({ queryKey: ['trade-team-names', config.league_id], queryFn: () => getTeamNames(config.league_id), enabled: configured, staleTime: 900_000 }, queryClient)
  if (!configured) return loading ? <PageSkeleton title="Sent trades" /> : <LeagueNotConfigured title="Sent trades" />
  return <div className="dashboard">
    {!offers.data && <PageHeader title="Sent trades" level={1} subtitle="Every offer you've approved, what happened to it, and how it looks now."
      actions={<Button variant="default" loading={offers.isFetching} onClick={() => { void offers.refetch(); void names.refetch(); void queryClient.invalidateQueries({ queryKey: ['sent-trade-score'] }) }}>Refresh offers</Button>} />}
    {offers.isPending && <SkeletonRegion label="Loading sent trades"><TableSkeleton columns={4} rows={6} /></SkeletonRegion>}
    {offers.isError && <ErrorAlert onRetry={() => { void offers.refetch() }}>
      Could not load sent trades: {offers.error.message}. {offers.data && 'Previously loaded offers may be out of date.'}
    </ErrorAlert>}
    {!offers.data && offers.isError && <Link to="/trades">← Trades</Link>}
    {offers.data && <SentTradesReview key={`${config.league_id}:${config.team_id}:${config.season}`} trades={sentTradeHistory(offers.data)} names={names.data} config={config} week={week}
      refreshing={offers.isFetching} onRefresh={() => { void offers.refetch(); void names.refetch(); void queryClient.invalidateQueries({ queryKey: ['sent-trade-score'] }) }} />}
  </div>
}
