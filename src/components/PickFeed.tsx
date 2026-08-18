import { useState } from 'react'
import type { DraftPickSummary } from '../api/types'
import { PlayerSummaryPopover } from './PlayerSummaryPopover'

interface Props {
  picks: DraftPickSummary[]
  myTeamId: string
}

export function PickFeed({ picks, myTeamId }: Props) {
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null)

  return (
    <section className="pick-feed">
      <h2>Pick feed</h2>
      {picks.length === 0 && <p className="muted">No picks yet.</p>}
      <ol reversed>
        {picks.map((pick) => (
          <li
            key={pick.pick_number}
            className={`pick-row ${pick.team_id === myTeamId ? 'my-pick' : ''}`}
            onClick={() => setExpandedPlayerId(pick.player_id)}
          >
            <span className="pick-number">#{pick.pick_number}</span>
            <span className="pick-name">{pick.name ?? pick.player_id}</span>
            {pick.position && <span className="pick-position">{pick.position}</span>}
            <span className="pick-team">team {pick.team_id}{pick.team_id === myTeamId ? ' (you)' : ''}</span>
          </li>
        ))}
      </ol>
      {expandedPlayerId && (
        <PlayerSummaryPopover playerId={expandedPlayerId} onClose={() => setExpandedPlayerId(null)} />
      )}
    </section>
  )
}
