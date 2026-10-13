import { Stack } from '@mantine/core'
import { useTradeContextControls } from '../hooks/useTradeContextControls'
import { useDraftConfig } from '../hooks/useDraftConfig'
import { TradeBuilder } from './TradeBuilder'
import { TradeContextPanel } from './TradeContextPanel'
import { OutgoingTradeProposals } from './OutgoingTradeProposals'
import { PageSkeleton } from './skeletons'
import { LeagueNotConfigured } from './ui/LeagueNotConfigured'

export function TradePage() {
  const { config, loading: configLoading } = useDraftConfig()
  const tradeContextControls = useTradeContextControls(config)
  const isConfigured = Boolean(config.league_id && config.team_id)

  if (!isConfigured) {
    if (configLoading) return <PageSkeleton />
    return <LeagueNotConfigured />
  }

  return (
    <div className="dashboard">
      <Stack gap="lg">
        <OutgoingTradeProposals config={config} />
        <TradeContextPanel config={config} controls={tradeContextControls} />
        <TradeBuilder config={config} controls={tradeContextControls} />
      </Stack>
    </div>
  )
}
