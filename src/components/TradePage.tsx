import { Button, Stack, Text } from '@mantine/core'
import { Link } from 'react-router-dom'
import { useDraftConfig } from '../hooks/useDraftConfig'
import { TradeBuilder } from './TradeBuilder'
import { OutgoingTradeProposals } from './OutgoingTradeProposals'
import { PageSkeleton } from './skeletons'

export function TradePage() {
  const { config, loading: configLoading } = useDraftConfig()
  const isConfigured = Boolean(config.league_id && config.team_id)

  if (!isConfigured) {
    if (configLoading) return <PageSkeleton />
    return (
      <div className="dashboard">
        <Stack gap="md" mt="xl" align="center">
          <Text ta="center" maw={480}>
            No league configured yet. Set your league and team in Settings first.
          </Text>
          <Button component={Link} to="/settings" variant="default">Go to Settings</Button>
        </Stack>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <Stack gap="lg">
        <OutgoingTradeProposals config={config} />
        <TradeBuilder config={config} />
      </Stack>
    </div>
  )
}
