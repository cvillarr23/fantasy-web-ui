import { Tabs } from '@mantine/core'
import { useDraftConfig } from '../hooks/useDraftConfig'
import { BacktestResultsPanel } from './BacktestResultsPanel'
import { VorpBrowserPanel } from './VorpBrowserPanel'

export function AnalyticsPage() {
  const { config } = useDraftConfig()

  return (
    <div className="dashboard">
      <Tabs defaultValue="vorp">
        <Tabs.List>
          <Tabs.Tab value="vorp">VORP Browser</Tabs.Tab>
          <Tabs.Tab value="backtest">Backtest Results</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="vorp" pt="md">
          <VorpBrowserPanel season={config.season} />
        </Tabs.Panel>
        <Tabs.Panel value="backtest" pt="md">
          <BacktestResultsPanel />
        </Tabs.Panel>
      </Tabs>
    </div>
  )
}
