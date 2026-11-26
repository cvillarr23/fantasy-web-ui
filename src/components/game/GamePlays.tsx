import type { FeedItem, GameStatus } from '../../api/types'
import { FeedRow } from '../matchup/FeedRow'
import { useFreshCursors } from '../matchup/useFreshCursors'

interface Props {
  plays: FeedItem[]
  status: GameStatus | null
  onOpenPlayer: (playerId: string) => void
}

/** This game's plays by matchup players, newest first, as rows of the Matchup feed. */
export function GamePlays({ plays, status, onOpenPlayer }: Props) {
  const fresh = useFreshCursors(plays)
  return (
    <section className="game-detail-column" aria-label="Fantasy-relevant plays">
      <header className="game-detail-column-header">
        <h2>Fantasy-relevant plays</h2>
      </header>
      {plays.length === 0 ? (
        <p className="feed-empty">{status === 'not_started' ? "No plays yet. The game hasn't kicked off." : 'No plays yet.'}</p>
      ) : (
        <ul className="feed-list">
          {plays.map((item) => (
            <FeedRow key={item.cursor} item={item} fresh={fresh.has(item.cursor)} onOpenPlayer={onOpenPlayer} showGame={false} />
          ))}
        </ul>
      )}
    </section>
  )
}
