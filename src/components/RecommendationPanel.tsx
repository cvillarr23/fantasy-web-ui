import { useState } from 'react'
import { isPickTooLateError } from '../api/client'
import { useToast } from '../hooks/useToast'
import type { DraftRecommendation } from '../api/types'

interface Props {
  recommendation: DraftRecommendation
  // Undefined when there's no known current pick to target - drafting is disabled in that
  // case, since the gateway can't check for a slot conflict without a pick_number either.
  pickNumber: number | undefined
  onDraftPlayer: (espnPlayerId: string, name: string, position: string, proTeam: string) => Promise<unknown>
}

export function RecommendationPanel({ recommendation, pickNumber, onDraftPlayer }: Props) {
  const candidates = recommendation.top_candidates ?? []
  const suggestion = recommendation.espn_suggestion
  const [busy, setBusy] = useState(false)
  const { toast, showToast } = useToast()

  async function handleDraft(espnId: string, name: string, position: string, proTeam: string) {
    setBusy(true)
    try {
      await onDraftPlayer(espnId, name, position, proTeam)
      showToast('success', `${name} published.`)
    } catch (err) {
      showToast('error', isPickTooLateError(err) ? 'Too late — the pick was already made.' : `Publish failed: ${String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="recommendation-panel">
      <div className="recommendation-column">
        <h2>System's top picks</h2>
        {candidates.length === 0 && <p className="muted">No recommendation yet.</p>}
        <ol>
          {candidates.map((c) => {
            const espnId = c.espn_id
            return (
            <li key={c.player_id} className="candidate-row">
              <span className="candidate-name">{c.name}</span>
              <span className="candidate-position">{c.position}</span>
              <span className="candidate-score">VORP {c.vorp_score.toFixed(1)}</span>
              {/* The click bot addresses ESPN's DOM by ESPN's own player id, so a player
                  missing from the crosswalk genuinely cannot be drafted from here. Blocking
                  is the only safe option: player_id is a different namespace that overlaps
                  numerically, so falling back to it would draft someone else entirely.
                  The reason is rendered as text rather than a title on a disabled button:
                  tooltips on disabled controls are unreliable across browsers, and a disabled
                  button is not focusable, so keyboard and screen-reader users cannot reach the
                  explanation at all. (The disabled+title button elsewhere in InterventionControls
                  is only a "not built yet" placeholder, where losing the hint costs nothing.) */}
              {espnId && pickNumber !== undefined ? (
                <button disabled={busy} onClick={() => handleDraft(espnId, c.name, c.position, c.team)}>
                  Draft this player
                </button>
              ) : espnId ? (
                <span className="candidate-unavailable" role="note">
                  No active pick number yet — publishing is disabled until one is known.
                </span>
              ) : (
                <span className="candidate-unavailable" role="note">
                  Draft in ESPN directly — no ESPN id for {c.name} in our crosswalk.
                </span>
              )}
            </li>
            )
          })}
        </ol>
      </div>
      <div className="recommendation-column">
        <h2>ESPN's suggested pick</h2>
        {pickNumber === undefined ? (
          <p className="muted">No active pick — nothing to compare yet.</p>
        ) : !suggestion ? (
          <p className="muted">ESPN hasn't published a suggestion for this pick yet.</p>
        ) : (
          <ol>
            <li className="candidate-row">
              <span className="candidate-name">{suggestion.name ?? `ESPN id ${suggestion.espn_player_id}`}</span>
              {suggestion.position && <span className="candidate-position">{suggestion.position}</span>}
              {/* Reviewer-caught (PR #49): team is already passed to the publish callback
                  below but was never rendered, so two same-named/same-position players
                  couldn't be told apart before triggering a live draft action. */}
              {suggestion.team && <span className="candidate-team">{suggestion.team}</span>}
              {/* Unlike the left column, VORP absence here isn't a hidden row - the issue
                  asks to keep the row and just blank the score when there's no VORP match. */}
              {suggestion.vorp_score !== null && (
                <span className="candidate-score">VORP {suggestion.vorp_score.toFixed(1)}</span>
              )}
              {/* espn_player_id is always present whenever this object exists at all (the
                  backend never resolves a suggestion without one), so unlike the left
                  column's crosswalk gap, drafting here is never blocked - only gated on
                  pickNumber, already guaranteed by the branch above. */}
              <button
                disabled={busy}
                onClick={() =>
                  handleDraft(
                    suggestion.espn_player_id,
                    suggestion.name ?? `ESPN id ${suggestion.espn_player_id}`,
                    suggestion.position ?? '',
                    suggestion.team ?? '',
                  )
                }
              >
                Draft this player
              </button>
            </li>
          </ol>
        )}
      </div>
      {toast && <p className={`status-message toast toast-${toast.tone}`}>{toast.message}</p>}
    </section>
  )
}
