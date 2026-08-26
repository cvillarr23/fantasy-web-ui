import { useEffect, useState } from 'react'
import { ConfigScreen } from './components/ConfigScreen'
import { DiagnosticsPanel } from './components/DiagnosticsPanel'
import { InterventionControls } from './components/InterventionControls'
import { PickFeed } from './components/PickFeed'
import { PracticeDraftScreen } from './components/PracticeDraftScreen'
import { RecommendationPanel } from './components/RecommendationPanel'
import { RosterVsLeaguePanel } from './components/RosterVsLeaguePanel'
import { StatusHeader } from './components/StatusHeader'
import { useDraftStream } from './hooks/useDraftStream'
import { triggerDraftPick } from './api/client'
import type { DraftConfig } from './api/types'
import './App.css'

const CONFIG_STORAGE_KEY = 'fantasy-web-ui.draft-config'

function loadStoredConfig(): DraftConfig {
  try {
    const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DraftConfig>
      return {
        league_id: parsed.league_id ?? '',
        team_id: parsed.team_id ?? '',
        season: parsed.season ?? new Date().getFullYear(),
        mode: parsed.mode ?? 'live',
      }
    }
  } catch {
    // Corrupt/absent storage - fall through to defaults.
  }
  return { league_id: '', team_id: '', season: new Date().getFullYear(), mode: 'live' }
}

function Dashboard({ config, onReconfigure }: { config: DraftConfig; onReconfigure: () => void }) {
  const { status, connected, connectionState, reconnectCount, lastHeartbeatAt, lastPickAt, stale, diagnostics } = useDraftStream(
    config.league_id,
    config.season,
  )
  const nextPickNumber = status?.recommendation?.pick_number
    ? Number(status.recommendation.pick_number)
    : undefined
  const [held, setHeld] = useState(false)
  useEffect(() => { setHeld(false) }, [nextPickNumber])

  return (
    <div className="dashboard">
      <div className="dashboard-toolbar">
        <button onClick={onReconfigure}>⚙ Reconfigure</button>
      </div>
      <StatusHeader
        status={status}
        connected={connected}
        connectionState={connectionState}
        reconnectCount={reconnectCount}
        lastHeartbeatAt={lastHeartbeatAt}
        lastPickAt={lastPickAt}
        stale={stale}
        myTeamId={config.team_id}
        leagueId={config.league_id}
        pickNumber={nextPickNumber}
        held={held}
        setHeld={setHeld}
        holdEnabled
      />
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <PickFeed picks={status?.recent_picks ?? []} myTeamId={config.team_id} />
          <RosterVsLeaguePanel status={status} myTeamId={config.team_id} />
          <DiagnosticsPanel
            status={status}
            connectionState={connectionState}
            reconnectCount={reconnectCount}
            stale={stale}
            entries={diagnostics}
          />
        </div>
        <div className="dashboard-side">
          <RecommendationPanel
            recommendation={status?.recommendation ?? {}}
            pickNumber={nextPickNumber}
            onDraftPlayer={(playerId, name, position, proTeam) => {
              if (nextPickNumber === undefined) return Promise.reject(new Error('No active pick to draft against.'))
              return triggerDraftPick(config.team_id, playerId, name, position, proTeam, {
                leagueId: config.league_id,
                pickNumber: nextPickNumber,
                expiresAt: status?.recommendation?.pick_clock_expires_at,
              })
            }}
          />
          <InterventionControls
            leagueId={config.league_id}
            teamId={config.team_id}
            pickNumber={nextPickNumber}
            pickClockExpiresAt={status?.recommendation?.pick_clock_expires_at}
            held={held}
            setHeld={setHeld}
          />
        </div>
      </div>
    </div>
  )
}

function App() {
  const [view, setView] = useState<'live' | 'practice'>('live')
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

  return (
    <>
      <nav className="app-nav">
        <button className={view === 'live' ? 'active' : ''} onClick={() => setView('live')}>
          Draft Day
        </button>
        <button className={view === 'practice' ? 'active' : ''} onClick={() => setView('practice')}>
          Practice Draft
        </button>
      </nav>
      {view === 'practice' ? (
        <PracticeDraftScreen />
      ) : configuring || !config ? (
        <ConfigScreen initial={config ?? loadStoredConfig()} onConfigured={handleConfigured} />
      ) : (
        <Dashboard config={config} onReconfigure={() => setConfiguring(true)} />
      )}
    </>
  )
}

export default App
