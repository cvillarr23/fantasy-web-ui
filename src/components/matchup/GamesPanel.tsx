import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatNumber } from '../ui/formatNumber'
import type { GameTile } from './matchupLive'
import { updatedAgo } from './matchupLive'

/** A side's points from a game. With none of its starters in the game it scored 0; with
 * starters but no points reported yet, the total is unknown. */
function sidePoints(total: number | null, players: string[]): number | null {
  return players.length === 0 ? 0 : total
}

function TileBody({ game }: { game: GameTile }) {
  const players = [
    game.myPlayers.length > 0 && `You: ${game.myPlayers.join(', ')}`,
    game.theirPlayers.length > 0 && `Opp: ${game.theirPlayers.join(', ')}`,
  ].filter(Boolean).join(' · ')
  return (
    <>
      <span className="game-tile-label">{game.label}</span>
      <span className={`game-tile-status game-tile-status-${game.status ?? 'unknown'}`}>{game.statusText}</span>
      {game.status !== 'not_started' && (
        <span className="game-tile-points">
          <span className="game-tile-mine">You {formatNumber(sidePoints(game.myPoints, game.myPlayers))} pts</span>
          <span className="game-tile-theirs">Opp {formatNumber(sidePoints(game.theirPoints, game.theirPlayers))} pts</span>
        </span>
      )}
      <span className="game-tile-players">{players}</span>
    </>
  )
}

function Tile({ game, href }: { game: GameTile; href: string | null }) {
  return (
    <li data-status={game.status ?? 'unknown'}>
      {href ? (
        <Link to={href} className="game-tile game-tile-link">
          <TileBody game={game} />
          <span className="game-tile-go">Game details →</span>
        </Link>
      ) : (
        <div className="game-tile"><TileBody game={game} /></div>
      )}
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
  /** Where a tile links to; tiles are non-interactive without it or without a game id. */
  gameHref?: (eventId: string) => string
  /** The Scoring guide page; the link is hidden when this is not given. */
  onOpenScoringGuide?: () => void
}

/** One tile per NFL game that has a starter in this matchup. */
export function GamesPanel({ games, updatedAt, gameHref, onOpenScoringGuide }: Props) {
  const now = useNow()
  const hrefFor = ({ eventId }: GameTile) => (eventId && gameHref ? gameHref(eventId) : null)
  return (
    <section className="games-panel" aria-label="Games in this matchup">
      <header className="games-panel-header">
        <h2>Games in this matchup</h2>
        {updatedAt != null && <span className="games-panel-updated">{updatedAgo(updatedAt, now)}</span>}
      </header>
      {games.length === 0 ? (
        <p className="feed-empty">No live game data for this week.</p>
      ) : (
        <ul className="games-list">{games.map((game) => <Tile key={game.key} game={game} href={hrefFor(game)} />)}</ul>
      )}
      {onOpenScoringGuide && (
        <button type="button" className="games-panel-link" onClick={onOpenScoringGuide}>How fantasy scoring works →</button>
      )}
    </section>
  )
}
