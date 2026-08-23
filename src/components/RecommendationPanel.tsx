import type { DraftRecommendation } from '../api/types'

interface Props {
  recommendation: DraftRecommendation
  onDraftPlayer: (espnPlayerId: string, name: string, position: string, proTeam: string) => void
}

export function RecommendationPanel({ recommendation, onDraftPlayer }: Props) {
  const candidates = recommendation.top_candidates ?? []

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
                  The reason is rendered as text, not a title attribute - browsers do not show
                  a tooltip for a disabled button, and it would not be reachable by keyboard
                  or screen reader if they did. */}
              {espnId ? (
                <button onClick={() => onDraftPlayer(espnId, c.name, c.position, c.team)}>
                  Draft this player
                </button>
              ) : (
                <span className="candidate-unavailable" role="note">
                  Draft in ESPN directly — no ESPN id for {c.name} in our crosswalk, which is
                  true of every K and D/ST.
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
    </section>
  )
}
