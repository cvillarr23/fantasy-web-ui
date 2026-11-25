import { useEffect, useState } from 'react'
import { formatNumber } from '../ui/formatNumber'
import type { GameTile } from './matchupLive'
import { updatedAgo } from './matchupLive'

function Tile({ game }: { game: GameTile }) {
  const players = [
    game.myPlayers.length > 0 && `You: ${game.myPlayers.join(', ')}`,
    game.theirPlayers.length > 0 && `Opp: ${game.theirPlayers.join(', ')}`,
  ].filter(Boolean).join(' · ')
  return (
    <li className="game-tile" data-status={game.status ?? 'unknown'}>
      <span className="game-tile-label">{game.label}</span>
      <span className={`game-tile-status game-tile-status-${game.status ?? 'unknown'}`}>{game.statusText}</span>
      {game.status !== 'not_started' && (
        <span className="game-tile-points">
          <span className="game-tile-mine">You {formatNumber(game.myPoints ?? 0)} pts</span>
          <span className="game-tile-theirs">Opp {formatNumber(game.theirPoints ?? 0)} pts</span>
        </span>
      )}
      <span className="game-tile-players">{players}</span>
    </li>
  )
}

/** Ticks once a second so "Updated Ns ago" keeps counting between polls. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

interface Props {
  games: GameTile[]
  /** Epoch milliseconds of the newest live snapshot. */
  updatedAt: number | null
  /** The Scoring guide page; the link is hidden when this is not given. */
  onOpenScoringGuide?: () => void
}

/** One non-interactive tile per NFL game that has a starter in this matchup. */
export function GamesPanel({ games, updatedAt, onOpenScoringGuide }: Props) {
  const now = useNow()
  return (
    <section className="games-panel" aria-label="Games in this matchup">
      <header className="games-panel-header">
        <h2>Games in this matchup</h2>
        {updatedAt != null && <span className="games-panel-updated">{updatedAgo(updatedAt, now)}</span>}
      </header>
      {games.length === 0 ? (
        <p className="feed-empty">No live game data for this week.</p>
      ) : (
        <ul className="games-list">{games.map((game) => <Tile key={game.key} game={game} />)}</ul>
      )}
      {onOpenScoringGuide && (
        <button type="button" className="games-panel-link" onClick={onOpenScoringGuide}>How fantasy scoring works →</button>
      )}
    </section>
  )
}
