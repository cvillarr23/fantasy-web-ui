import type { GameTeam, LiveGame } from '../../api/types'
import { LiveBadge } from '../player/LiveBadge'
import { kickoffText, liveLineParts, liveState, UNKNOWN } from '../player/liveGameState'
import { BadgeSlot } from '../ui/BadgeSlot'
import { asLiveBlock } from './gameDetails'

function Team({ team, home = false }: { team: GameTeam; home?: boolean }) {
  return (
    <div className={home ? 'game-detail-team game-detail-team-home' : 'game-detail-team'}>
      <span className="game-detail-abbr">{team.abbr ?? UNKNOWN}</span>
      <span className="game-detail-score">{team.score ?? UNKNOWN}</span>
    </div>
  )
}

/** The clock and ball while the game is on, the kickoff time before it, nothing once final. */
function Situation({ game }: { game: LiveGame }) {
  const live = asLiveBlock(game)
  if (liveState(live) === 'upcoming') return <span>{kickoffText(game.kickoff)}</span>
  if (liveState(live) !== 'live') return null
  const { clock, field, redZone } = liveLineParts(live)
  return (
    <>
      <span>{clock}</span>
      {field && <span className={redZone ? 'live-game-redzone' : undefined}>{field}</span>}
    </>
  )
}

/** Away team on the left, home on the right, as on a scoreboard. */
export function GameHeader({ game }: { game: LiveGame }) {
  return (
    <section className="game-detail-header" aria-label="Score">
      <Team team={game.away} />
      <div className="game-detail-status">
        {game.status === 'not_started'
          ? <BadgeSlot label="Upcoming" color="gray" variant="outline" />
          : <LiveBadge live={asLiveBlock(game)} />}
        <Situation game={game} />
      </div>
      <Team team={game.home} home />
    </section>
  )
}
