import type { DraftStatusResponse } from '../api/types'

interface Props {
  status: DraftStatusResponse | null
}

export function TeamComparisonPanel({ status }: Props) {
  const teamRosters = status?.team_rosters ?? {}
  const teamAggregates = status?.team_aggregates ?? {}
  const teamIdsFromPayload = status?.team_ids ?? []
  const teamIds =
    teamIdsFromPayload.length > 0
      ? teamIdsFromPayload
      : Array.from(new Set([...Object.keys(teamRosters), ...Object.keys(teamAggregates)])).sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true }),
        )

  return (
    <section className="team-comparison-panel">
      <h2>Team comparison</h2>
      {teamIds.length === 0 ? (
        <p className="muted">No team data yet.</p>
      ) : (
        <div className="team-comparison-grid">
          {teamIds.map((teamId) => {
            const roster = teamRosters[teamId] ?? []
            const aggregate = teamAggregates[teamId] ?? {}
            const aggregateEntries = Object.entries(aggregate)
            return (
              <article key={teamId} className="team-comparison-card">
                <h3>Team {teamId}</h3>
                <p className="muted">Picks: {roster.length}</p>
                {aggregateEntries.length > 0 && (
                  <ul className="team-aggregate-list">
                    {aggregateEntries.map(([metric, value]) => (
                      <li key={metric}>
                        <span>{metric}</span>
                        <strong>{Number.isFinite(value) ? value.toFixed(1) : String(value)}</strong>
                      </li>
                    ))}
                  </ul>
                )}
                {roster.length > 0 ? (
                  <ol className="team-roster-list">
                    {roster.map((pick) => (
                      <li key={pick.pick_number}>
                        {pick.name ?? `Player ${pick.player_id ?? pick.espn_player_id ?? 'unknown'}`}
                        {pick.position ? ` (${pick.position})` : ''}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="muted">No picks yet.</p>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
