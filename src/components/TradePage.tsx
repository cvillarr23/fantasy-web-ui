import { Button, Stack, Text } from '@mantine/core'
import { Link } from 'react-router-dom'
import { loadStoredConfig } from '../hooks/useDraftConfig'
import { RoadmapBanner } from './RoadmapBanner'
import { TradeBuilder } from './TradeBuilder'

export function TradePage() {
  const config = loadStoredConfig()
  const isConfigured = Boolean(config.league_id && config.team_id)

  if (!isConfigured) {
    return (
      <div className="dashboard">
        <Stack gap="md" mt="xl" align="center">
          <Text ta="center" maw={480}>
            No league configured yet. Set up your league and team on the Draft Day page first.
          </Text>
          <Button component={Link} to="/draft" variant="default">Go to Draft Day</Button>
        </Stack>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <RoadmapBanner
        title="AI-suggested trades with opponent-schedule handicapping are planned"
        issueUrl="https://github.com/cvillarr23/fantasy-web-ui/issues/78"
      />
      <TradeBuilder config={config} />
    </div>
  )
}
