import { useState } from 'react'
import { pauseDraft, resumeDraft, triggerDraftPick } from '../api/client'
import { PlayerPicker } from './PlayerPicker'
import type { PlayerSearchResult } from '../api/types'

interface Props {
  leagueId: string
  teamId: string
  pickNumber?: number
}

// UI copy is deliberate: fantasy-browser-worker's draft_clicker.js (WORKER-06) now consumes
// draft_targets and fires a real click in ESPN's UI, so this button is a live action, not a
// dry-run log - the copy must say so clearly since it's used mid-draft under time pressure.
export function InterventionControls({ leagueId, teamId, pickNumber }: Props) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [manualPlayer, setManualPlayer] = useState<PlayerSearchResult | null>(null)

  async function run(action: () => Promise<unknown>, label: string) {
    setBusy(true)
    setMessage(null)
    try {
      await action()
      setMessage(`${label} succeeded.`)
    } catch (err) {
      setMessage(`${label} failed: ${String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="intervention-controls">
      <h2>Intervene</h2>
      <div className="button-row">
        <button disabled={busy} onClick={() => run(() => pauseDraft(leagueId, pickNumber), 'Pause')}>
          Hold our next auto-pick
        </button>
        <button disabled={busy} onClick={() => run(() => resumeDraft(leagueId, pickNumber), 'Resume')}>
          Release our next auto-pick
        </button>
      </div>
      <p className="muted">
        Pauses/resumes only <em>our own</em> system's auto-publish for the upcoming pick —
        not ESPN's own native autodraft setting for this league.
      </p>
      <div className="button-row">
        <button disabled title="Not available yet — pending fantasy-browser-worker#32">
          Toggle ESPN autodraft (not available yet)
        </button>
      </div>

      <form
        className="manual-pick-form"
        onSubmit={(e) => {
          e.preventDefault()
          // espn_id, never player_id: the worker clicks ESPN's DOM by ESPN's id and the two
          // namespaces overlap numerically, so the wrong one drafts a different real player.
          const espnId = manualPlayer?.espn_id
          if (!espnId) return
          run(
            () => triggerDraftPick(teamId, espnId, manualPlayer.name, manualPlayer.position, manualPlayer.team),
            'Manual draft-pick publish',
          ).then(() => setManualPlayer(null))
        }}
      >
        <p className="muted">
          This actually drafts the selected player in ESPN — the browser worker consumes
          this and clicks it for you. Only use this if you actually want it locked in now.
        </p>
        <PlayerPicker selected={manualPlayer} onSelect={setManualPlayer} onClear={() => setManualPlayer(null)} />
        {manualPlayer && !manualPlayer.espn_id && (
          <p className="status-message">
            {manualPlayer.name} has no ESPN id in our crosswalk, which is true of every K and
            D/ST. The click bot addresses players by ESPN's id, so this one has to be drafted
            in ESPN directly.
          </p>
        )}
        <button type="submit" disabled={busy || !manualPlayer?.espn_id}>Publish manual pick</button>
      </form>

      {message && <p className="status-message">{message}</p>}
    </section>
  )
}
