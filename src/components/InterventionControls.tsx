import { useState } from 'react'
import { isPickTooLateError, pauseDraft, resumeDraft, triggerDraftPick } from '../api/client'
import { PlayerPicker } from './PlayerPicker'
import { useToast } from '../hooks/useToast'
import type { PlayerSearchResult } from '../api/types'

interface Props {
  leagueId: string
  teamId: string
  // Forwarded verbatim to triggerDraftPick so the gateway/click bot know whether to submit
  // for real without guessing - see the comment on triggerDraftPick in api/client.ts.
  mode: 'live' | 'practice'
  pickNumber?: number
  isMyTurn: boolean
  pickClockExpiresAt: number | undefined
  held: boolean
  setHeld: (held: boolean) => void
}

// UI copy is deliberate: fantasy-browser-worker's draft_clicker.js (WORKER-06) now consumes
// draft_targets and fires a real click in ESPN's UI, so this button is a live action, not a
// dry-run log - the copy must say so clearly since it's used mid-draft under time pressure.
export function InterventionControls({ leagueId, teamId, mode, pickNumber, isMyTurn, pickClockExpiresAt, held, setHeld }: Props) {
  const [busy, setBusy] = useState(false)
  const { toast, showToast } = useToast()
  const [manualPlayer, setManualPlayer] = useState<PlayerSearchResult | null>(null)

  async function run(action: () => Promise<unknown>, label: string) {
    setBusy(true)
    try {
      await action()
      showToast('success', `${label} succeeded.`)
    } catch (err) {
      showToast('error', `${label} failed: ${String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  // Two separate try/catch blocks, not one: isPickTooLateError is only valid for the trigger
  // endpoint's 409. If pauseDraft's own try/catch were merged with the trigger call's, a
  // pause-specific 409 would be mislabeled "the pick was already made".
  async function submitManualPick() {
    const espnId = manualPlayer?.espn_id
    // No known pick_number means we can't ask the gateway to check the slot - refuse rather
    // than publish unvalidated, which is the exact gap this fix exists to close.
    if (!espnId || pickNumber === undefined || !isMyTurn) return
    setBusy(true)
    try {
      // Pausing first means the manual choice always wins over our own pending auto-publish.
      await pauseDraft(leagueId, pickNumber)
    } catch (err) {
      showToast('error', `Pause failed: ${String(err)}`)
      setBusy(false)
      return
    }
    setHeld(true)
    try {
      await triggerDraftPick(teamId, espnId, manualPlayer.name, manualPlayer.position, manualPlayer.team, {
        leagueId,
        pickNumber,
        mode,
        expiresAt: pickClockExpiresAt,
      })
      showToast('success', `${manualPlayer.name} drafted.`)
      setManualPlayer(null)
    } catch (err) {
      showToast(
        'error',
        isPickTooLateError(err) ? 'Too late — the pick was already made.' : `Manual draft-pick publish failed: ${String(err)}`,
      )
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
            {manualPlayer.name} has no ESPN id in our crosswalk. The click bot addresses players
            by ESPN's id, so this one has to be drafted in ESPN directly.
          </p>
        )}
        <button type="submit" disabled={busy || !manualPlayer?.espn_id || pickNumber === undefined || !isMyTurn}>
          Publish manual pick
        </button>
        {pickNumber === undefined ? (
          <p className="status-message">No active pick number yet — publishing is disabled until one is known.</p>
        ) : (
          !isMyTurn && (
            <p className="status-message">Not your turn yet — publishing is disabled until the clock reaches your team.</p>
          )
        )}
      </form>

      {toast && <p className={`status-message toast toast-${toast.tone}`}>{toast.message}</p>}
    </section>
  )
}
