import { useState } from 'react'
import { isPickTooLateError } from '../api/client'
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
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleDraft(espnId: string, name: string, position: string, proTeam: string) {
    setBusy(true)
    setMessage(null)
    try {
      await onDraftPlayer(espnId, name, position, proTeam)
      setMessage(`${name} published.`)
    } catch (err) {
      setMessage(isPickTooLateError(err) ? 'Too late — the pick was already made.' : `Publish failed: ${String(err)}`)
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
      <div className="recommendation-column placeholder-column">
        <h2>ESPN's suggested pick</h2>
        {/* Follow-up ticket: ESPN's own recommended-next-pick isn't ingested anywhere
            yet - it only exists inside ESPN's UI and would need fantasy-browser-worker
            to scrape it. Kept as an explicit slot so this drops in cleanly later. */}
        <p className="muted">Not available yet — pending a fantasy-browser-worker follow-up.</p>
      </div>
      {message && <p className="status-message">{message}</p>}
    </section>
  )
}
