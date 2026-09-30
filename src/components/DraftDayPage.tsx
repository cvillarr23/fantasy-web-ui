import { useEffect, useState } from 'react'
import { Button } from '@mantine/core'
import { ConfigScreen } from './ConfigScreen'
import { DiagnosticsPanel } from './DiagnosticsPanel'
import { InterventionControls } from './InterventionControls'
import { PickFeed } from './PickFeed'
import { RecommendationPanel } from './RecommendationPanel'
import { RosterVsLeaguePanel } from './RosterVsLeaguePanel'
import { StatusHeader } from './StatusHeader'
import { TeamComparisonPanel } from './TeamComparisonPanel'
import { TeamPositionGrid } from './TeamPositionGrid'
import { useDraftStream } from '../hooks/useDraftStream'
import { useDraftConfig } from '../hooks/useDraftConfig'
import { triggerDraftPick } from '../api/client'
import type { DraftConfig } from '../api/types'

function Dashboard({ config, onReconfigure }: { config: DraftConfig; onReconfigure: () => void }) {
  const { status, connected, connectionState, reconnectCount, lastHeartbeatAt, lastPickAt, stale, diagnostics } = useDraftStream(
    config.league_id,
    config.season,
  )
  const loading = status === null
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
        <Button variant="default" onClick={onReconfigure}>⚙ Reconfigure</Button>
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
        loading={loading}
      />
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <PickFeed picks={status?.recent_picks ?? []} myTeamId={config.team_id} status={status} loading={loading} />
          <TeamPositionGrid
            teamIds={status?.team_ids}
            teamAggregates={status?.team_aggregates}
            myTeamId={config.team_id}
            loading={loading}
          />
          <RosterVsLeaguePanel status={status} myTeamId={config.team_id} loading={loading} />
          <DiagnosticsPanel
            status={status}
            connectionState={connectionState}
            reconnectCount={reconnectCount}
            stale={stale}
            entries={diagnostics}
            loading={loading}
          />
        </div>
        <div className="dashboard-side">
          <RecommendationPanel
            recommendation={status?.recommendation ?? {}}
            pickNumber={nextPickNumber}
            isMyTurn={isMyTurn}
            loading={loading}
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
        loading={loading}
      />
    </div>
  )
}

export function DraftDayPage() {
  const { config, loading, setConfig } = useDraftConfig()
  const isConfigured = Boolean(config.league_id && config.team_id)
  const [reconfiguring, setReconfiguring] = useState(false)

  function handleConfigured(newConfig: DraftConfig) {
    // ConfigScreen already POSTed it to the server; just update the shared copy.
    setConfig(newConfig)
    setReconfiguring(false)
  }

  if (!isConfigured && loading) return null

  if (reconfiguring || !isConfigured) {
    return <ConfigScreen initial={config} onConfigured={handleConfigured} />
  }

  return <Dashboard config={config} onReconfigure={() => setReconfiguring(true)} />
}
