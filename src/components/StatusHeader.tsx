import { useEffect, useState } from 'react'
import { pauseDraft } from '../api/client'
import type { DraftStatusResponse } from '../api/types'

interface Props {
  status: DraftStatusResponse | null
  connected: boolean
  connectionState: 'idle' | 'connecting' | 'connected' | 'reconnecting'
  reconnectCount: number
  lastHeartbeatAt: number | null
  lastPickAt: number | null
  stale: boolean
  myTeamId: string
  leagueId: string
  pickNumber: number | undefined
  held: boolean
  setHeld: (held: boolean) => void
}

function getConnectionLabel(
  connected: boolean,
  connectionState: 'idle' | 'connecting' | 'connected' | 'reconnecting',
  reconnectCount: number,
): string {
  if (connected) return reconnectCount > 0 ? `live (reconnected ${reconnectCount}x)` : 'live'
  if (connectionState === 'reconnecting') return 'reconnecting…'
  if (connectionState === 'connecting') return 'connecting…'
  return 'idle'
}

function formatAge(timestamp: number | null, now: number): string {
  if (timestamp === null) return '—'
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000))
  return `${seconds}s ago`
}

/** epochSeconds is read fresh off `status` on every render, never cached into state, so a
 * payload that arrives after an SSE reconnect corrects the countdown immediately. */
function secondsRemaining(epochSeconds: number | undefined, now: number): number | null {
  if (epochSeconds === undefined) return null
  return Math.max(0, Math.round(epochSeconds - now / 1000))
}

export function StatusHeader({
  status,
  connected,
  connectionState,
  reconnectCount,
  lastHeartbeatAt,
  lastPickAt,
  stale,
  myTeamId,
  leagueId,
  pickNumber,
  held,
  setHeld,
}: Props) {
  const [now, setNow] = useState(() => Date.now())
  const [holdBusy, setHoldBusy] = useState(false)
  const [holdError, setHoldError] = useState<string | null>(null)
  const health = status?.pipeline_health ?? 'unknown'
  const onTheClock = status?.on_the_clock_team_id ?? null
  const isMyTurn = onTheClock !== null && onTheClock === myTeamId
  const onTheClockLabel = onTheClock === null ? '—' : isMyTurn ? 'Your team' : `Team ${onTheClock}`
  const lastHeartbeatTime = lastHeartbeatAt
    ? new Date(lastHeartbeatAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—'
  const autoPublishIn = secondsRemaining(status?.recommendation?.auto_publish_at, now)
  const espnClockIn = secondsRemaining(status?.recommendation?.pick_clock_expires_at, now)

  useEffect(() => {
    const ageTimer = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(ageTimer)
  }, [])

  async function handleHold() {
    setHoldBusy(true)
    setHoldError(null)
    try {
      await pauseDraft(leagueId, pickNumber)
      setHeld(true)
    } catch (err) {
      setHoldError(String(err))
    } finally {
      setHoldBusy(false)
    }
  }

  return (
    <header className="status-header">
      <div className={`health-badge health-${stale ? 'stale' : health}`}>
        {stale ? 'STALE' : health.toUpperCase()}
      </div>
      <div className="status-field">
        <span className="label">Connection</span>
        <span>{getConnectionLabel(connected, connectionState, reconnectCount)}</span>
      </div>
      <div className="status-field">
        <span className="label">Job</span>
        <span>{status?.job_state ?? '—'}</span>
      </div>
      <div className="status-field">
        <span className="label">Last heartbeat</span>
        <span>{lastHeartbeatTime}</span>
      </div>
      <div className="status-field">
        <span className="label">Last pick</span>
        <span>{formatAge(lastPickAt, now)}</span>
      </div>
      <div className={`status-field ${isMyTurn ? 'my-turn' : ''}`}>
        <span className="label">On the clock</span>
        <span>{onTheClockLabel}{isMyTurn ? ' (you!)' : ''}</span>
      </div>
      <div className="status-field">
        <span className="label">Next pick #</span>
        <span>{status?.recommendation?.pick_number ?? '—'}</span>
      </div>
      {isMyTurn && (
        <div className={`pick-clock-band ${held ? 'held' : ''}`}>
          {held ? (
            <span>Pick held — auto-publish paused. Release it from Intervene.</span>
          ) : (
            <>
              {espnClockIn !== null && <span className="countdown">ESPN clock: {espnClockIn}s</span>}
              {autoPublishIn !== null && <span className="countdown">Auto-publish in: {autoPublishIn}s</span>}
              {espnClockIn === null && autoPublishIn === null && <span>No auto-publish scheduled yet</span>}
              <button onClick={handleHold} disabled={holdBusy}>
                Hold this pick
              </button>
            </>
          )}
          {holdError && <span className="status-message">Hold failed: {holdError}</span>}
        </div>
      )}
    </header>
  )
}
