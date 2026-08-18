import { useState } from 'react'
import { ConfigScreen } from './components/ConfigScreen'
import { InterventionControls } from './components/InterventionControls'
import { PickFeed } from './components/PickFeed'
import { RecommendationPanel } from './components/RecommendationPanel'
import { StatusHeader } from './components/StatusHeader'
import { useDraftStream } from './hooks/useDraftStream'
import { triggerDraftPick } from './api/client'
import type { DraftConfig } from './api/types'
import './App.css'

const CONFIG_STORAGE_KEY = 'fantasy-web-ui.draft-config'

function loadStoredConfig(): DraftConfig {
  try {
    const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY)
    if (raw) return JSON.parse(raw) as DraftConfig
  } catch {
    // Corrupt/absent storage - fall through to defaults.
  }
  return { league_id: '', team_id: '', season: new Date().getFullYear() }
}

function Dashboard({ config, onReconfigure }: { config: DraftConfig; onReconfigure: () => void }) {
  const { status, connected, stale } = useDraftStream(config.league_id, config.season)
  const nextPickNumber = status?.recommendation?.pick_number
    ? Number(status.recommendation.pick_number)
    : undefined

  return (
    <div className="dashboard">
      <div className="dashboard-toolbar">
        <button onClick={onReconfigure}>⚙ Reconfigure</button>
      </div>
      <StatusHeader status={status} connected={connected} stale={stale} myTeamId={config.team_id} />
      <div className="dashboard-grid">
        <PickFeed picks={status?.recent_picks ?? []} myTeamId={config.team_id} />
        <div className="dashboard-side">
          <RecommendationPanel
            recommendation={status?.recommendation ?? {}}
            onDraftPlayer={(playerId, name, position, proTeam) =>
              triggerDraftPick(config.team_id, playerId, name, position, proTeam)
            }
          />
          <InterventionControls leagueId={config.league_id} teamId={config.team_id} pickNumber={nextPickNumber} />
        </div>
      </div>
    </div>
  )
}

function App() {
  const [config, setConfig] = useState<DraftConfig | null>(() => {
    const stored = loadStoredConfig()
    return stored.league_id && stored.team_id ? stored : null
  })
  const [configuring, setConfiguring] = useState(config === null)

  function handleConfigured(newConfig: DraftConfig) {
    window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig))
    setConfig(newConfig)
    setConfiguring(false)
  }

  if (configuring || !config) {
    return <ConfigScreen initial={config ?? loadStoredConfig()} onConfigured={handleConfigured} />
  }

  return <Dashboard config={config} onReconfigure={() => setConfiguring(true)} />
}

export default App
