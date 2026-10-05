import { useMemo, useState } from 'react'
import { ListRowsSkeleton } from './skeletons'
import type { DraftPickSummary, DraftStatusResponse } from '../api/types'
import { usePlayerDetailsCache } from '../hooks/usePlayerDetailsCache'
import { useTeamNames } from '../hooks/useTeamNames'
import { AutodraftBadge } from './AutodraftBadge'
import { PlayerCard } from './PlayerCard'
import { PlayerSummaryPopover } from './PlayerSummaryPopover'

interface Props {
  picks: DraftPickSummary[]
  myTeamId: string
  status: DraftStatusResponse | null
  loading?: boolean
}

function formatDisplayTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}


export function PickFeed({ picks, myTeamId, status, loading = false }: Props) {
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null)
  const myTeamPicks = useMemo(() => picks.filter((pick) => pick.team_id === myTeamId), [picks, myTeamId])
  const playerIds = useMemo(() => picks.map((pick) => pick.player_id), [picks])
  const playerDetailsById = usePlayerDetailsCache(playerIds)
  const teamNames = useTeamNames()
  // was_autodrafted is only ever set (true/false) once the backend listener actually
  // processes a pick - if that listener isn't running at all, the column silently stays
  // NULL forever, indistinguishable in the badge below from a legitimate opponent pick.
  // Cross-referencing listener/pipeline health here means an operator sees "this may be
  // stale" instead of every pick quietly looking confirmed-fine.
  const provenanceUnreliable =
    myTeamPicks.length > 0 && status !== null && (status.listener_state !== 'Active' || status.pipeline_health !== 'healthy')

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
          const draftingTeam = pick.team_id === myTeamId ? 'Your team' : (teamNames[pick.team_id] ?? `Team ${pick.team_id}`)
          // was_autodrafted is only meaningful on our own team's picks - it's null for every
          // opponent pick, so the myTeamId check guards against a false positive there.
          const isSuspectedAutodraft = pick.team_id === myTeamId && pick.was_autodrafted === true
          return (
            <PlayerCard
              key={pick.pick_number}
              variant="listItem"
              className={pick.team_id === myTeamId ? 'my-pick' : ''}
              onClick={() => setExpandedPlayerId(pick.player_id)}
              disabled={!pick.player_id}
              ariaLabel={`Pick ${pick.pick_number}: ${displayName}, picked by ${draftingTeam}${
                isSuspectedAutodraft ? ', ESPN autodraft' : ''
              }. Show player summary.`}
              before={<span className="pick-number">#{pick.pick_number}</span>}
              player={{ id: pick.player_id ?? '', name: displayName, position: displayPosition, team: proTeam }}
              after={<span className="pick-team">picked by {draftingTeam}</span>}
              badges={isSuspectedAutodraft ? <AutodraftBadge isSuspected /> : undefined}
            />
          )
        })}
      </ol>
    )
  }

  return (
    <section className="pick-feed">
      <h2>Pick feed</h2>
      {provenanceUnreliable && (
        <p className="pick-feed-provenance-warning">
          ⚠ Pick provenance may be unreliable — draft listener not responding (last event{' '}
          {formatDisplayTime(status?.listener_last_event_at)}). The "ESPN autodraft" badge below may be missing
          on a pick it should be flagging.
        </p>
      )}
      <div className="pick-feed-sections">
        <article className="pick-section">
          <h3>League picks</h3>
          {loading ? <ListRowsSkeleton ordered rows={4} itemClassName="pick-row" label="Loading picks" /> : renderPickList(picks, 'No picks yet.')}
        </article>
        <article className="pick-section">
          <h3>Your team picks</h3>
          {loading ? <ListRowsSkeleton ordered rows={4} itemClassName="pick-row" label="Loading picks" /> : renderPickList(myTeamPicks, 'Your team has not picked yet.')}
        </article>
      </div>
      {expandedPlayerId && (
        <PlayerSummaryPopover playerId={expandedPlayerId} onClose={() => setExpandedPlayerId(null)} />
      )}
    </section>
  )
}
