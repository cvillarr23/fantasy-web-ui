import { useEffect, useMemo, useState } from 'react'
import { getPlayerSummary } from '../api/client'
import type { DraftPickSummary } from '../api/types'
import { PlayerSummaryPopover } from './PlayerSummaryPopover'

interface Props {
  picks: DraftPickSummary[]
  myTeamId: string
}

export function PickFeed({ picks, myTeamId }: Props) {
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null)
  const [playerDetailsById, setPlayerDetailsById] = useState<Record<string, { name: string; team: string; position: string }>>({})
  const myTeamPicks = useMemo(() => picks.filter((pick) => pick.team_id === myTeamId), [picks, myTeamId])
  const missingPlayerDetails = useMemo(
    () => [...new Set(picks.map((pick) => pick.player_id).filter((id): id is string => Boolean(id)))]
      .filter((playerId) => !playerDetailsById[playerId]),
    [picks, playerDetailsById],
  )

  useEffect(() => {
    if (missingPlayerDetails.length === 0) return
    let cancelled = false

    void Promise.all(
      missingPlayerDetails.map(async (playerId) => {
        try {
          const summary = await getPlayerSummary(playerId)
          return [playerId, { name: summary.name, team: summary.team, position: summary.position }] as const
        } catch {
          return null
        }
      }),
    ).then((results) => {
      if (cancelled) return
      const nextDetails: Record<string, { name: string; team: string; position: string }> = {}
      for (const result of results) {
        if (!result) continue
        nextDetails[result[0]] = result[1]
      }
      if (Object.keys(nextDetails).length > 0) {
        setPlayerDetailsById((current) => ({ ...current, ...nextDetails }))
      }
    })

    return () => {
      cancelled = true
    }
  }, [missingPlayerDetails])

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
          return (
            <li key={pick.pick_number} className={`pick-row ${pick.team_id === myTeamId ? 'my-pick' : ''}`}>
              <button
                type="button"
                className="pick-row-button"
                onClick={() => setExpandedPlayerId(pick.player_id)}
                disabled={!pick.player_id}
                aria-label={`Pick ${pick.pick_number}: ${displayName}, picked by ${draftingTeam}. Show player summary.`}
              >
                <span className="pick-number">#{pick.pick_number}</span>
                <span className="pick-name">{displayName}</span>
                {displayPosition && <span className="pick-position">{displayPosition}</span>}
                {proTeam && <span className="pick-pro-team">{proTeam}</span>}
                <span className="pick-team">picked by {draftingTeam}</span>
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
