import type { DraftRecommendation } from '../api/types'

interface Props {
  recommendation: DraftRecommendation
  onDraftPlayer: (playerId: string, name: string, position: string, proTeam: string) => void
}

export function RecommendationPanel({ recommendation, onDraftPlayer }: Props) {
  const candidates = recommendation.top_candidates ?? []

  return (
    <section className="recommendation-panel">
      <div className="recommendation-column">
        <h2>System's top picks</h2>
        {candidates.length === 0 && <p className="muted">No recommendation yet.</p>}
        <ol>
          {candidates.map((c) => (
            <li key={c.player_id} className="candidate-row">
              <span className="candidate-name">{c.name}</span>
              <span className="candidate-position">{c.position}</span>
              <span className="candidate-score">VORP {c.vorp_score.toFixed(1)}</span>
              <button onClick={() => onDraftPlayer(c.player_id, c.name, c.position, c.team)}>
                Draft this player
              </button>
            </li>
          ))}
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
