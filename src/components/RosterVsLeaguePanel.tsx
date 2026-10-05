import { ListRowsSkeleton } from './skeletons'
import type { DraftStatusResponse } from '../api/types'
import { buildPositionComparisonRows } from './positionComparison'

interface Props {
  status: DraftStatusResponse | null
  myTeamId: string
  loading?: boolean
}

function formatLeagueMean(value: number): string {
  return value.toFixed(1)
}

export function RosterVsLeaguePanel({ status, myTeamId, loading = false }: Props) {
  const rows = buildPositionComparisonRows(status?.team_aggregates, myTeamId, status?.team_ids)

  return (
    <section className="roster-comparison-panel">
      <h2>Your roster vs. league average</h2>
      {loading ? (
        <ListRowsSkeleton
          rows={6}
          listClassName="roster-comparison-list"
          itemClassName="roster-comparison-row"
          label="Loading roster comparison"
        />
      ) : rows.length === 0 ? (
        <p className="muted">Position-count aggregates are not available yet.</p>
      ) : (
        <ul className="roster-comparison-list">
          {rows.map((row) => (
            <li key={row.position} className="roster-comparison-row">
              <span className="roster-position">{row.position}</span>
              <span>Yours {row.yourCount}</span>
              <span>League avg {formatLeagueMean(row.leagueMean)}</span>
              <span>Rank {row.rank}/{row.teamCount}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
