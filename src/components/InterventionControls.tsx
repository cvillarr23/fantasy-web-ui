import { useState } from 'react'
import { pauseDraft, resumeDraft, triggerDraftPick } from '../api/client'
import { PlayerPicker } from './PlayerPicker'
import type { PlayerSearchResult } from '../api/types'

interface Props {
  leagueId: string
  teamId: string
  pickNumber?: number
}

// UI copy is deliberate: /v1/trigger/draft-pick publishes to the draft_targets queue,
// but nothing consumes that queue to actually click ESPN's UI yet (fantasy-browser-worker's
// WORKER-06 is unbuilt) - don't let the button imply it does more than it does.
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
          Pause auto-draft
        </button>
        <button disabled={busy} onClick={() => run(() => resumeDraft(leagueId, pickNumber), 'Resume')}>
          Resume auto-draft
        </button>
      </div>

      <form
        className="manual-pick-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (!manualPlayer) return
          run(
            () => triggerDraftPick(teamId, manualPlayer.player_id, manualPlayer.name, manualPlayer.position, manualPlayer.team),
            'Manual draft-pick publish',
          ).then(() => setManualPlayer(null))
        }}
      >
        <p className="muted">
          Publishes to the draft_targets queue only — it does not yet click ESPN's UI for
          you (that automation is a follow-up). Use this to hand off a target once that
          piece ships, or to log what you're about to do manually in ESPN.
        </p>
        <PlayerPicker selected={manualPlayer} onSelect={setManualPlayer} onClear={() => setManualPlayer(null)} />
        <button type="submit" disabled={busy || !manualPlayer}>Publish manual pick</button>
      </form>

      {message && <p className="status-message">{message}</p>}
    </section>
  )
}
