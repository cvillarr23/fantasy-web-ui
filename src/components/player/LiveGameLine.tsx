import type { ReactNode } from 'react'
import type { LiveBlock } from '../../api/types'
import {
  finalLineText, kickoffText, liveLineParts, liveState, matchupText, opponentText, statLineText,
} from './liveGameState'

/** One item of the line. Its leading `|` hangs in the gap before it, so the row's clipping
 * hides it when the item wraps to the start of a line and it can never dangle at a line end. */
function Item({ sep, className, children }: { sep?: boolean; className?: string; children: ReactNode }) {
  return (
    <span className={className ? `live-game-item ${className}` : 'live-game-item'}>
      {sep && <span className="live-game-sep" aria-hidden="true">|</span>}
      {children}
    </span>
  )
}

function LiveParts({ live }: { live: LiveBlock }) {
  const { clock, score, field, redZone } = liveLineParts(live)
  return (
    <>
      <Item>{clock}</Item>
      <Item sep>{score}</Item>
      {field && <Item sep className={redZone ? 'live-game-redzone' : undefined}>{field}</Item>}
    </>
  )
}

function UpcomingParts({ live, team }: { live: LiveBlock; team?: string | null }) {
  const kickoff = kickoffText(live.kickoff)
  const opponent = opponentText(live, team) ?? matchupText(live)
  if (kickoff && opponent) return <><Item>{kickoff}</Item><Item sep>{opponent}</Item></>
  return <Item>{kickoff ?? opponent ?? 'Upcoming'}</Item>
}

function firstLine(live: LiveBlock, team?: string | null): ReactNode {
  const state = liveState(live)
  if (state === 'live') return <LiveParts live={live} />
  if (state === 'upcoming') return <UpcomingParts live={live} team={team} />
  return <Item>{finalLineText(live, team) ?? 'Final'}</Item>
}

/** The on-field game line for a PlayerCard's `meta`: clock, score and ball while live, kickoff
 * before the game, the result after it, with the stat line muted underneath. */
export function LiveGameLine({ live, team }: { live: LiveBlock | null | undefined; team?: string | null }) {
  if (!live || liveState(live) === 'none') return null
  const stats = liveState(live) === 'upcoming' ? '' : statLineText(live.stat_line)
  return (
    <span className="live-game-line">
      <span className="live-game-main">{firstLine(live, team)}</span>
      {stats && <span className="live-game-stats">{stats}</span>}
    </span>
  )
}
