import { useMemo, useState } from 'react'
import { Button, Skeleton, UnstyledButton } from '@mantine/core'
import type { DraftPickSummary, TeamAggregate } from '../api/types'
import { usePlayerDetailsCache } from '../hooks/usePlayerDetailsCache'
import { useTeamNames } from '../hooks/useTeamNames'
import { PlayerSummaryPopover } from './PlayerSummaryPopover'

interface Props {
  teamIds: string[]
  teamRosters: Record<string, DraftPickSummary[]>
  teamAggregates: Record<string, TeamAggregate>
  myTeamId: string
  loading?: boolean
}

// A pick's scarcity/matchup multiplier only gets a badge once it's far enough from neutral
// (1.0) to be worth a reader's attention - otherwise every pick would carry a badge.
const SCARCITY_BADGE_THRESHOLD = 1.05
const MATCHUP_BADGE_DELTA = 0.1

function SkeletonTeamColumns() {
  return (
    <div className="team-comparison-columns">
      {Array.from({ length: 3 }).map((_, i) => (
        <article className="team-column" key={i}>
          <Skeleton height={16} width="60%" mb={10} />
          <Skeleton height={12} width="90%" mb={12} />
          <Skeleton height={12} width="100%" mb={6} />
          <Skeleton height={12} width="100%" mb={6} />
          <Skeleton height={12} width="100%" />
        </article>
      ))}
    </div>
  )
}

export function TeamComparisonPanel({ teamIds: teamIdsFromStatus, teamRosters, teamAggregates, myTeamId, loading = false }: Props) {
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  const teamIds = useMemo(() => {
    // team_ids (from draft_slots) is the source of truth once the backend has synced it -
    // it's the only source that knows about a team before its first pick lands, so it's what
    // lets a zero-pick team still get a column. Falling back to team_rosters'/team_aggregates'
    // own keys keeps this panel working against an older backend that doesn't send it yet.
    const ids = teamIdsFromStatus.length > 0
      ? [...teamIdsFromStatus]
      : Array.from(new Set([...Object.keys(teamRosters), ...Object.keys(teamAggregates)]))
    ids.sort((a, b) => {
      if (a === myTeamId) return -1
      if (b === myTeamId) return 1
      return a.localeCompare(b, undefined, { numeric: true })
    })
    return ids
  }, [teamIdsFromStatus, teamRosters, teamAggregates, myTeamId])

  const allPlayerIds = useMemo(
    () => Object.values(teamRosters).flat().map((pick) => pick.player_id),
    [teamRosters],
  )
  const playerDetailsById = usePlayerDetailsCache(allPlayerIds)
  const teamNames = useTeamNames()

  const valueAlertTeamId = teamIds.find((teamId) => teamAggregates[teamId]?.most_recent_pick_value_alert)

  function handleToggle() {
    const next = !collapsed
    setCollapsed(next)
    if (next) setExpandedPlayerId(null)
  }

  return (
    <section className={`team-comparison-panel ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="diagnostics-header">
        <h2>Team comparison</h2>
        <div className="diagnostics-actions">
          <Button size="xs" variant="default" onClick={handleToggle} aria-expanded={!collapsed}>
            {collapsed ? 'Show' : 'Hide'}
          </Button>
        </div>
      </div>
      {loading ? (
        !collapsed && <SkeletonTeamColumns />
      ) : teamIds.length === 0 ? (
        <p className="muted">No team data yet.</p>
      ) : (
        !collapsed && (
          <>
            {valueAlertTeamId && (
              <ValueAlertBanner
                teamId={valueAlertTeamId}
                myTeamId={myTeamId}
                aggregate={teamAggregates[valueAlertTeamId]}
                roster={teamRosters[valueAlertTeamId]}
                playerDetailsById={playerDetailsById}
                teamNames={teamNames}
              />
            )}
            <div className="team-comparison-columns">
              {teamIds.map((teamId) => (
                <TeamColumn
                  key={teamId}
                  teamId={teamId}
                  isMyTeam={teamId === myTeamId}
                  roster={teamRosters[teamId] ?? []}
                  aggregate={teamAggregates[teamId]}
                  playerDetailsById={playerDetailsById}
                  teamNames={teamNames}
                  onSelectPlayer={setExpandedPlayerId}
                />
              ))}
            </div>
            {expandedPlayerId && (
              <PlayerSummaryPopover playerId={expandedPlayerId} onClose={() => setExpandedPlayerId(null)} />
            )}
          </>
        )
      )}
    </section>
  )
}

function ValueAlertBanner({
  teamId,
  myTeamId,
  aggregate,
  roster,
  playerDetailsById,
  teamNames,
}: {
  teamId: string
  myTeamId: string
  aggregate: TeamAggregate
  roster: DraftPickSummary[]
  playerDetailsById: Record<string, { name: string }>
  teamNames: Record<string, string>
}) {
  const latestPick = roster[roster.length - 1]
  const teamLabel = teamId === myTeamId ? 'Your team' : (teamNames[teamId] ?? `Team ${teamId}`)
  const playerName = latestPick
    ? (latestPick.player_id ? playerDetailsById[latestPick.player_id]?.name : undefined) ?? latestPick.name ?? 'this player'
    : 'this player'

  return (
    <div className="banner banner-info value-alert-banner" role="note">
      <span>
        {teamLabel} just got great value: {playerName}
        {aggregate.most_recent_pick_vorp_rank != null && (
          <> (VORP rank #{aggregate.most_recent_pick_vorp_rank}, expected round {aggregate.most_recent_pick_expected_round})</>
        )}
      </span>
    </div>
  )
}

function TeamColumn({
  teamId,
  isMyTeam,
  roster,
  aggregate,
  playerDetailsById,
  onSelectPlayer,
  teamNames,
}: {
  teamId: string
  isMyTeam: boolean
  roster: DraftPickSummary[]
  aggregate: TeamAggregate | undefined
  playerDetailsById: Record<string, { name: string; team: string; position: string }>
  onSelectPlayer: (playerId: string) => void
  teamNames: Record<string, string>
}) {
  const positionCounts = aggregate?.position_counts ?? {}
  const positions = Object.keys(positionCounts).sort()

  return (
    <article className={`team-column ${isMyTeam ? 'my-team-column' : ''}`}>
      <h3>{isMyTeam ? 'Your team' : (teamNames[teamId] ?? `Team ${teamId}`)}</h3>
      <div className="team-aggregate-strip">
        <span className="candidate-score">VORP {(aggregate?.total_vorp ?? 0).toFixed(1)}</span>
        <span className="candidate-score">Proj {(aggregate?.total_projected_points ?? 0).toFixed(1)} pts</span>
        {positions.map((position) => (
          <span key={position} className="position-chip">
            {position} {positionCounts[position]}
          </span>
        ))}
      </div>
      {roster.length === 0 ? (
        <p className="muted">No picks yet.</p>
      ) : (
        <ol className="team-roster-list">
          {roster.map((pick) => {
            const details = pick.player_id ? playerDetailsById[pick.player_id] : undefined
            const displayName =
              details?.name ?? pick.name ?? (pick.espn_player_id ? `ESPN player ${pick.espn_player_id}` : 'Unknown player')
            const displayPosition = details?.position ?? pick.position
            const scarcityBadge = pick.scarcity_multiplier != null && pick.scarcity_multiplier > SCARCITY_BADGE_THRESHOLD
            const matchupBadge = pick.matchup_coefficient != null && Math.abs(pick.matchup_coefficient - 1) > MATCHUP_BADGE_DELTA
            return (
              <li key={pick.pick_number} className="pick-row">
                <UnstyledButton
                  className="pick-row-button"
                  onClick={() => pick.player_id && onSelectPlayer(pick.player_id)}
                  disabled={!pick.player_id}
                  aria-label={`Pick ${pick.pick_number}: ${displayName}. Show player summary.`}
                >
                  <span className="pick-number">#{pick.pick_number}</span>
                  <span className="pick-name">{displayName}</span>
                  {displayPosition && <span className="pick-position">{displayPosition}</span>}
                  {pick.vorp_score != null && <span className="candidate-score">VORP {pick.vorp_score.toFixed(1)}</span>}
                  {scarcityBadge && (
                    <span className="badge-scarcity" title="Current pipeline value, not a snapshot from pick time">
                      scarcity-driven
                    </span>
                  )}
                  {matchupBadge && (
                    <span className="badge-matchup" title="Current pipeline value, not a snapshot from pick time">
                      matchup {pick.matchup_coefficient!.toFixed(2)}x
                    </span>
                  )}
                </UnstyledButton>
              </li>
            )
          })}
        </ol>
      )}
    </article>
  )
}
