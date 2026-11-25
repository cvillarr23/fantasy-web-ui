import type { ReactNode } from 'react'
import type { LiveBlock } from '../../api/types'
import {
  finalLineText, kickoffText, liveLineParts, liveState, matchupText, opponentText, statLineText,
} from './liveGameState'

function Sep() {
  return <span className="live-game-sep" aria-hidden="true">|</span>
}

function LiveParts({ live }: { live: LiveBlock }) {
  const { clock, score, field, redZone } = liveLineParts(live)
  return (
    <>
      <span>{clock}</span><Sep /><span>{score}</span>
      {field && <><Sep /><span className={redZone ? 'live-game-redzone' : undefined}>{field}</span></>}
    </>
  )
}

function UpcomingParts({ live, team }: { live: LiveBlock; team?: string | null }) {
  const kickoff = kickoffText(live.kickoff)
  const opponent = opponentText(live, team) ?? matchupText(live)
  if (kickoff && opponent) return <><span>{kickoff}</span><Sep /><span>{opponent}</span></>
  return <span>{kickoff ?? opponent ?? 'Upcoming'}</span>
}

function firstLine(live: LiveBlock, team?: string | null): ReactNode {
  const state = liveState(live)
  if (state === 'live') return <LiveParts live={live} />
  if (state === 'upcoming') return <UpcomingParts live={live} team={team} />
  return <span>{finalLineText(live, team) ?? 'Final'}</span>
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
