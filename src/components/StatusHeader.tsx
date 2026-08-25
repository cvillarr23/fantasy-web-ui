import { useEffect, useState } from 'react'
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

export function StatusHeader({ status, connected, connectionState, reconnectCount, lastHeartbeatAt, lastPickAt, stale, myTeamId }: Props) {
  const [now, setNow] = useState(0)
  const health = status?.pipeline_health ?? 'unknown'
  const onTheClock = status?.on_the_clock_team_id ?? null
  const isMyTurn = onTheClock !== null && onTheClock === myTeamId
  const onTheClockLabel = onTheClock === null ? '—' : isMyTurn ? 'Your team' : `Team ${onTheClock}`
  const lastHeartbeatTime = lastHeartbeatAt
    ? new Date(lastHeartbeatAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—'

  useEffect(() => {
    const ageTimer = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(ageTimer)
  }, [])

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
    </header>
  )
}
