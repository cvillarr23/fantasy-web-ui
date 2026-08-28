import { useMemo, useState } from 'react'
import type { DraftPickSummary } from '../api/types'
import { usePlayerDetailsCache } from '../hooks/usePlayerDetailsCache'
import { PlayerSummaryPopover } from './PlayerSummaryPopover'

interface Props {
  picks: DraftPickSummary[]
  myTeamId: string
}

export function PickFeed({ picks, myTeamId }: Props) {
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null)
  const myTeamPicks = useMemo(() => picks.filter((pick) => pick.team_id === myTeamId), [picks, myTeamId])
  const playerIds = useMemo(() => picks.map((pick) => pick.player_id), [picks])
  const playerDetailsById = usePlayerDetailsCache(playerIds)

  function renderPickList(list: DraftPickSummary[], emptyText: string) {
    if (list.length === 0) {
      return <p className="muted">{emptyText}</p>
    }
    return (
      <ol reversed>
        {list.map((pick) => {
          const details = pick.player_id ? playerDetailsById[pick.player_id] : undefined
          // A pick with no internal id is normal, not an error. Show the ESPN id rather than
          // a bare "Unknown player" so the pick is still identifiable against the draft board.
          const displayName =
            details?.name ?? pick.name ?? (pick.espn_player_id ? `ESPN player ${pick.espn_player_id}` : 'Unknown player')
          const displayPosition = details?.position ?? pick.position
          const proTeam = details?.team
          const draftingTeam = pick.team_id === myTeamId ? 'Your team' : `Team ${pick.team_id}`
          // was_autodrafted is only meaningful on our own team's picks - it's null for every
          // opponent pick, so the myTeamId check guards against a false positive there.
          const isSuspectedAutodraft = pick.team_id === myTeamId && pick.was_autodrafted === true
          return (
            <li key={pick.pick_number} className={`pick-row ${pick.team_id === myTeamId ? 'my-pick' : ''}`}>
              <button
                type="button"
                className="pick-row-button"
                onClick={() => setExpandedPlayerId(pick.player_id)}
                disabled={!pick.player_id}
                aria-label={`Pick ${pick.pick_number}: ${displayName}, picked by ${draftingTeam}${
                  isSuspectedAutodraft ? ', ESPN autodraft' : ''
                }. Show player summary.`}
              >
                <span className="pick-number">#{pick.pick_number}</span>
                <span className="pick-name">{displayName}</span>
                {displayPosition && <span className="pick-position">{displayPosition}</span>}
                {proTeam && <span className="pick-pro-team">{proTeam}</span>}
                <span className="pick-team">picked by {draftingTeam}</span>
                {isSuspectedAutodraft && (
                  <span
                    className="badge-autodraft"
                    title="Our system's attempted pick was never confirmed - ESPN autodrafted for us instead."
                  >
                    ⚠ ESPN autodraft
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ol>
    )
  }

  return (
    <section className="pick-feed">
      <h2>Pick feed</h2>
      <div className="pick-feed-sections">
        <article className="pick-section">
          <h3>League picks</h3>
          {renderPickList(picks, 'No picks yet.')}
        </article>
        <article className="pick-section">
          <h3>Your team picks</h3>
          {renderPickList(myTeamPicks, 'Your team has not picked yet.')}
        </article>
      </div>
      {expandedPlayerId && (
        <PlayerSummaryPopover playerId={expandedPlayerId} onClose={() => setExpandedPlayerId(null)} />
      )}
    </section>
  )
}
