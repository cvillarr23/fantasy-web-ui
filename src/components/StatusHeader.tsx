import type { DraftStatusResponse } from '../api/types'

interface Props {
  status: DraftStatusResponse | null
  connected: boolean
  stale: boolean
  myTeamId: string
}

export function StatusHeader({ status, connected, stale, myTeamId }: Props) {
  const health = status?.pipeline_health ?? 'unknown'
  const onTheClock = status?.on_the_clock_team_id ?? null
  const isMyTurn = onTheClock !== null && onTheClock === myTeamId

  return (
    <header className="status-header">
      <div className={`health-badge health-${stale ? 'stale' : health}`}>
        {stale ? 'STALE' : health.toUpperCase()}
      </div>
      <div className="status-field">
        <span className="label">Connection</span>
        <span>{connected ? 'live' : 'reconnecting…'}</span>
      </div>
      <div className="status-field">
        <span className="label">Job</span>
        <span>{status?.job_state ?? '—'}</span>
      </div>
      <div className={`status-field ${isMyTurn ? 'my-turn' : ''}`}>
        <span className="label">On the clock</span>
        <span>{onTheClock ?? '—'}{isMyTurn ? ' (you!)' : ''}</span>
      </div>
      <div className="status-field">
        <span className="label">Next pick #</span>
        <span>{status?.recommendation?.pick_number ?? '—'}</span>
      </div>
    </header>
  )
}
