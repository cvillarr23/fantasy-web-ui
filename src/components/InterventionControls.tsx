import { useState } from 'react'
import { pauseDraft, resumeDraft, triggerDraftPick } from '../api/client'

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
  const [manualPlayerId, setManualPlayerId] = useState('')
  const [manualName, setManualName] = useState('')
  const [manualPosition, setManualPosition] = useState('')
  const [manualProTeam, setManualProTeam] = useState('')

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
          run(
            () => triggerDraftPick(teamId, manualPlayerId, manualName, manualPosition, manualProTeam),
            'Manual draft-pick publish',
          )
        }}
      >
        <p className="muted">
          Publishes to the draft_targets queue only — it does not yet click ESPN's UI for
          you (that automation is a follow-up). Use this to hand off a target once that
          piece ships, or to log what you're about to do manually in ESPN.
        </p>
        <input placeholder="player_id" value={manualPlayerId} onChange={(e) => setManualPlayerId(e.target.value)} required />
        <input placeholder="name" value={manualName} onChange={(e) => setManualName(e.target.value)} required />
        <input placeholder="position" value={manualPosition} onChange={(e) => setManualPosition(e.target.value)} required />
        <input placeholder="pro team" value={manualProTeam} onChange={(e) => setManualProTeam(e.target.value)} required />
        <button type="submit" disabled={busy}>Publish manual pick</button>
      </form>

      {message && <p className="status-message">{message}</p>}
    </section>
  )
}
