import { useState } from 'react'
import { setDraftConfig, startDraftSync } from '../api/client'
import type { DraftConfig } from '../api/types'

interface Props {
  initial: DraftConfig
  onConfigured: (config: DraftConfig) => void
}

export function ConfigScreen({ initial, onConfigured }: Props) {
  const [leagueId, setLeagueId] = useState(initial.league_id)
  const [teamId, setTeamId] = useState(initial.team_id)
  const [season, setSeason] = useState(initial.season)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [started, setStarted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const config: DraftConfig = { league_id: leagueId.trim(), team_id: teamId.trim(), season, mode: 'live' }
      await setDraftConfig(config)
      onConfigured(config)
    } catch (err) {
      setError(String(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleStart() {
    setBusy(true)
    setError(null)
    try {
      await startDraftSync()
      setStarted(true)
    } catch (err) {
      setError(String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="config-screen">
      <h1>Draft day setup</h1>
      <form onSubmit={handleSubmit}>
        <label>
          League ID
          <input value={leagueId} onChange={(e) => setLeagueId(e.target.value)} required />
        </label>
        <label>
          Your team ID
          <input value={teamId} onChange={(e) => setTeamId(e.target.value)} required />
        </label>
        <label>
          Season
          <input type="number" value={season} onChange={(e) => setSeason(Number(e.target.value))} required />
        </label>
        <button type="submit" disabled={busy}>Save config &amp; continue to dashboard</button>
      </form>
      <button disabled={busy} onClick={handleStart}>
        {started ? 'Draft-sync job started ✓' : 'Start draft-sync job'}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  )
}
