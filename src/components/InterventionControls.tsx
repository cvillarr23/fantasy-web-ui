import { useState } from 'react'
import { isPickTooLateError, pauseDraft, resumeDraft, triggerDraftPick } from '../api/client'
import { PlayerPicker } from './PlayerPicker'
import type { PlayerSearchResult } from '../api/types'

interface Props {
  leagueId: string
  teamId: string
  pickNumber?: number
  pickClockExpiresAt: number | undefined
  held: boolean
  setHeld: (held: boolean) => void
}

// UI copy is deliberate: fantasy-browser-worker's draft_clicker.js (WORKER-06) now consumes
// draft_targets and fires a real click in ESPN's UI, so this button is a live action, not a
// dry-run log - the copy must say so clearly since it's used mid-draft under time pressure.
export function InterventionControls({ leagueId, teamId, pickNumber, pickClockExpiresAt, held, setHeld }: Props) {
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

  // Kept separate from run() above: a 409 here means "the pick is gone", but run()'s generic
  // formatting is shared with Pause/Resume, where a 409 means something unrelated - folding
  // this in would leak pick-specific wording into those failures too.
  async function submitManualPick() {
    const espnId = manualPlayer?.espn_id
    if (!espnId) return
    setBusy(true)
    setMessage(null)
    try {
      // Pausing first means the manual choice always wins over our own pending auto-publish.
      await pauseDraft(leagueId, pickNumber)
      setHeld(true)
      await triggerDraftPick(teamId, espnId, manualPlayer.name, manualPlayer.position, manualPlayer.team, {
        leagueId,
        pickNumber,
        expiresAt: pickClockExpiresAt,
      })
      setMessage('Manual draft-pick publish succeeded.')
      setManualPlayer(null)
    } catch (err) {
      setMessage(isPickTooLateError(err) ? 'Too late — the pick was already made.' : `Manual draft-pick publish failed: ${String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="intervention-controls">
      <h2>Intervene</h2>
      <div className="button-row">
        <button disabled={busy} onClick={() => run(async () => { await pauseDraft(leagueId, pickNumber); setHeld(true) }, 'Pause')}>
          Hold our next auto-pick
        </button>
        <button disabled={busy} onClick={() => run(async () => { await resumeDraft(leagueId, pickNumber); setHeld(false) }, 'Resume')}>
          Release our next auto-pick
        </button>
      </div>
      <p className="muted">
        Pauses/resumes only <em>our own</em> system's auto-publish for the upcoming pick —
        not ESPN's own native autodraft setting for this league.
        {held && ' Currently held.'}
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
          submitManualPick()
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
