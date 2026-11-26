import { formatPoints } from '../player/popoverFormat'
import { splitShares } from './gameDetails'

function Side({ label, points, tone }: { label: string; points: number | null; tone: 'mine' | 'theirs' }) {
  return (
    <div className={`game-detail-side game-detail-side-${tone}`}>
      <span className="game-detail-side-label">{label}</span>
      <span className="game-detail-side-points">{formatPoints(points)}</span>
    </div>
  )
}

interface Props {
  mine: number | null
  theirs: number | null
}

/** Your starters' points from this game against the opponent's. The bar only repeats the two
 * numbers, so screen readers skip it. */
export function FantasySplit({ mine, theirs }: Props) {
  const shares = splitShares(mine, theirs)
  return (
    <section className="game-detail-split" aria-label="Fantasy points from this game">
      <Side label="Your fantasy points from this game" points={mine} tone="mine" />
      <Side label="Opponent's fantasy points from this game" points={theirs} tone="theirs" />
      <div className="game-detail-bar" aria-hidden="true">
        <span className="game-detail-bar-mine" style={{ width: `${shares.mine}%` }} />
        <span className="game-detail-bar-theirs" style={{ width: `${shares.theirs}%` }} />
      </div>
      <p className="game-detail-note">Starters only. Bench points don't count.</p>
    </section>
  )
}
