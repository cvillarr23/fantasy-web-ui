import { useEffect, useState } from 'react'
import { isPickTooLateError, pauseDraft, resumeDraft, setAutoPublishEnabled, triggerDraftPick } from '../api/client'
import { PlayerPicker } from './PlayerPicker'
import { useToast } from '../hooks/useToast'
import type { DraftConfig, PlayerSearchResult } from '../api/types'

interface Props {
  // team_id/league_id/mode all come from the same stored config for this draft - taking the
  // whole object (rather than three separate props) is what keeps triggerDraftPick's own
  // signature honest below: there's only one place these three values can be sourced from,
  // so a future caller can't independently forget one the way the manual-pick path once did.
  config: DraftConfig
  pickNumber?: number
  isMyTurn: boolean
  pickClockExpiresAt: number | undefined
  held: boolean
  setHeld: (held: boolean) => void
  // Kill switch state from the latest /v1/draft/status poll (issue #108). Passed as two
  // separate primitives rather than folded into `config` because these are live/polled
  // status, not stored draft config - same granularity as pickNumber/isMyTurn above.
  autoPublishEnabled: boolean
  autoPublishDisabledBy: 'manual' | 'circuit_breaker' | null
  onAutoPublishChange: (enabled: boolean) => void
}

// UI copy is deliberate: fantasy-browser-worker's draft_clicker.js (WORKER-06) now consumes
// draft_targets and fires a real click in ESPN's UI, so this button is a live action, not a
// dry-run log - the copy must say so clearly since it's used mid-draft under time pressure.
export function InterventionControls({
  config,
  pickNumber,
  isMyTurn,
  pickClockExpiresAt,
  held,
  setHeld,
  autoPublishEnabled,
  autoPublishDisabledBy,
  onAutoPublishChange,
}: Props) {
  const { league_id: leagueId } = config
  const [busy, setBusy] = useState(false)
  const [autoPublishBusy, setAutoPublishBusy] = useState(false)
  const { toast, showToast } = useToast()
  const [manualPlayer, setManualPlayer] = useState<PlayerSearchResult | null>(null)
  // Selecting a player before it's actually our turn used to just disable the submit button
  // with no way to act on the choice - the operator had to keep watching the clock and
  // resubmit the instant it turned. queued means "publish this automatically the moment
  // isMyTurn flips true", without touching pauseDraft/triggerDraftPick until that moment
  // actually arrives (submitManualPick below still does the real pause-then-trigger work).
  const [queued, setQueued] = useState(false)

  async function toggleAutoPublish() {
    const next = !autoPublishEnabled
    setAutoPublishBusy(true)
    try {
      await setAutoPublishEnabled(leagueId, next)
      onAutoPublishChange(next)
      showToast('success', `Auto-publish ${next ? 'enabled' : 'disabled'}.`)
    } catch (err) {
      showToast('error', `Failed to ${next ? 'enable' : 'disable'} auto-publish: ${String(err)}`)
    } finally {
      setAutoPublishBusy(false)
    }
  }

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
      await triggerDraftPick(config, espnId, manualPlayer.name, manualPlayer.position, manualPlayer.team, {
        pickNumber,
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

  // One handler for all three states of the same button: already our turn publishes right
  // away (unchanged behavior); not our turn yet queues it (or, if already queued, cancels
  // the queue instead of re-queuing) - see the isMyTurn effect above for the actual publish.
  function handleManualPickButtonClick() {
    if (!manualPlayer?.espn_id || pickNumber === undefined) return
    if (isMyTurn) {
      submitManualPick()
      return
    }
    if (queued) {
      setQueued(false)
      showToast('success', 'Queue cancelled.')
      return
    }
    setQueued(true)
    showToast('success', `${manualPlayer.name} queued — will publish automatically when it's your turn.`)
  }

  // Fires the moment isMyTurn flips true for a player queued while it wasn't our turn yet -
  // otherwise the operator has to keep watching the clock and resubmit by hand the instant
  // it turns, which is the exact gap this queue exists to close. Cleared before calling
  // submitManualPick so a re-render mid-publish can't re-trigger it.
  useEffect(() => {
    if (queued && isMyTurn && manualPlayer?.espn_id && pickNumber !== undefined && !busy) {
      setQueued(false)
      submitManualPick()
    }
  }, [queued, isMyTurn, pickNumber, manualPlayer, busy, submitManualPick])

  return (
    <section className="intervention-controls">
      <h2>Intervene</h2>
      <div className={`auto-publish-kill-switch${autoPublishEnabled ? '' : ' auto-publish-kill-switch-off'}`}>
        <label className="auto-publish-toggle">
          <input
            type="checkbox"
            checked={autoPublishEnabled}
            disabled={autoPublishBusy}
            onChange={toggleAutoPublish}
          />
          Auto-publish picks
        </label>
        {autoPublishDisabledBy === 'circuit_breaker' ? (
          <p className="status-message circuit-breaker-notice">
            ⚠ Auto-disabled after repeated pick failures — will retry automatically on the
            next pick, or re-enable now.
          </p>
        ) : autoPublishDisabledBy === 'manual' ? (
          <p className="muted">
            When off, picks are never sent automatically — you must click a player below to
            draft.
          </p>
        ) : null}
      </div>
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
          handleManualPickButtonClick()
        }}
      >
        <p className="muted">
          This actually drafts the selected player in ESPN — the browser worker consumes
          this and clicks it for you. Only use this if you actually want it locked in now.
        </p>
        <PlayerPicker
          selected={manualPlayer}
          onSelect={(player) => {
            setManualPlayer(player)
            setQueued(false)
          }}
          onClear={() => {
            setManualPlayer(null)
            setQueued(false)
          }}
        />
        {manualPlayer && !manualPlayer.espn_id && (
          <p className="status-message">
            {manualPlayer.name} has no ESPN id in our crosswalk. The click bot addresses players
            by ESPN's id, so this one has to be drafted in ESPN directly.
          </p>
        )}
        <button type="submit" disabled={busy || !manualPlayer?.espn_id || pickNumber === undefined}>
          {isMyTurn ? 'Publish manual pick' : queued ? 'Cancel queue' : 'Queue for my turn'}
        </button>
        {pickNumber === undefined ? (
          <p className="status-message">No active pick number yet — publishing is disabled until one is known.</p>
        ) : (
          !isMyTurn &&
          (queued ? (
            <p className="status-message">
              Queued — {manualPlayer?.name} will publish automatically the instant it's your turn.
            </p>
          ) : (
            <p className="status-message">Not your turn yet — click above to queue this pick for your turn.</p>
          ))
        )}
      </form>

      {toast && <p className={`status-message toast toast-${toast.tone}`}>{toast.message}</p>}
    </section>
  )
}
