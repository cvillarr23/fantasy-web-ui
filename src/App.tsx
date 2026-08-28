import { useEffect, useState } from 'react'
import { ConfigScreen } from './components/ConfigScreen'
import { DiagnosticsPanel } from './components/DiagnosticsPanel'
import { InterventionControls } from './components/InterventionControls'
import { PickFeed } from './components/PickFeed'
import { PracticeDraftScreen } from './components/PracticeDraftScreen'
import { RecommendationPanel } from './components/RecommendationPanel'
import { RosterVsLeaguePanel } from './components/RosterVsLeaguePanel'
import { StatusHeader } from './components/StatusHeader'
import { TeamComparisonPanel } from './components/TeamComparisonPanel'
import { TeamPositionGrid } from './components/TeamPositionGrid'
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
  const onTheClockTeamId = status?.on_the_clock_team_id ?? null
  const isMyTurn = onTheClockTeamId !== null && onTheClockTeamId === config.team_id
  const [held, setHeld] = useState(false)
  useEffect(() => { setHeld(false) }, [nextPickNumber])
  // Optimistic override so the toggle reflects the operator's own action immediately,
  // rather than waiting on the next stream tick - cleared whenever the backend's own value
  // changes (including the circuit breaker self-healing it out from under us).
  const [autoPublishOverride, setAutoPublishOverride] = useState<boolean | null>(null)
  useEffect(() => { setAutoPublishOverride(null) }, [status?.auto_publish_enabled, status?.auto_publish_disabled_by])
  const autoPublishEnabled = autoPublishOverride ?? status?.auto_publish_enabled ?? true
  const autoPublishDisabledBy = autoPublishOverride !== null
    ? (autoPublishOverride ? null : 'manual')
    : status?.auto_publish_disabled_by ?? null

  return (
    <div className="dashboard">
      <div className="dashboard-toolbar">
        <button onClick={onReconfigure}>⚙ Reconfigure</button>
      </div>
      <div className="stream-banners">
        {status && (status.recent_picks?.length ?? 0) === 0 && connected && !stale && (
          <p className="banner banner-info" role="status" aria-live="polite">
            Connected and listening. No picks have been observed yet.
          </p>
        )}
        {/* Deliberately not gated on recent_picks.length or status: a stall that starts mid-draft
            (after picks have already landed) is exactly the case where this warning matters most -
            gating it on "no picks yet" would hide it right when the user needs it. Likewise, not
            requiring `status` means the banner still shows if the stream never got a first
            snapshot at all (e.g. backend down from the start). */}
        {(!connected || stale) && (
          <p className="banner banner-warning" role="status" aria-live="polite">
            {stale
              ? 'No draft updates received recently - the stream may be stalled.'
              : 'Reconnecting to the draft status stream…'}
          </p>
        )}
      </div>
      <StatusHeader
        status={status}
        connected={connected}
        connectionState={connectionState}
        reconnectCount={reconnectCount}
        lastHeartbeatAt={lastHeartbeatAt}
        lastPickAt={lastPickAt}
        stale={stale}
        isMyTurn={isMyTurn}
        myTeamId={config.team_id}
        leagueId={config.league_id}
        pickNumber={nextPickNumber}
        held={held}
        setHeld={setHeld}
        holdEnabled
      />
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <PickFeed picks={status?.recent_picks ?? []} myTeamId={config.team_id} status={status} />
          <TeamPositionGrid teamIds={status?.team_ids} teamAggregates={status?.team_aggregates} myTeamId={config.team_id} />
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
            isMyTurn={isMyTurn}
            onDraftPlayer={(playerId, name, position, proTeam) => {
              if (nextPickNumber === undefined) return Promise.reject(new Error('No active pick to draft against.'))
              return triggerDraftPick(config, playerId, name, position, proTeam, {
                pickNumber: nextPickNumber,
                expiresAt: status?.recommendation?.pick_clock_expires_at,
              })
            }}
          />
          <InterventionControls
            config={config}
            pickNumber={nextPickNumber}
            isMyTurn={isMyTurn}
            pickClockExpiresAt={status?.recommendation?.pick_clock_expires_at}
            held={held}
            setHeld={setHeld}
            autoPublishEnabled={autoPublishEnabled}
            autoPublishDisabledBy={autoPublishDisabledBy}
            onAutoPublishChange={setAutoPublishOverride}
          />
        </div>
      </div>
      <TeamComparisonPanel
        teamIds={status?.team_ids ?? []}
        teamRosters={status?.team_rosters ?? {}}
        teamAggregates={status?.team_aggregates ?? {}}
        myTeamId={config.team_id}
      />
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
