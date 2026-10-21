import type { TeamCandidateCounts } from '../../api/tradeCandidateTypes'
import type { LeagueTradeContext, RosterDeficitsResponse } from '../../api/types'
import { teamNeeds, headToHeadWeeks } from './tradeFinderFormat'
import { StrengthChip } from '../ui/StrengthChip'

export interface TeamCardsProps {
  counts: TeamCandidateCounts[]
  context?: LeagueTradeContext
  deficits?: RosterDeficitsResponse
  ourTeamId: string
  selectedTeamId: string
  onSelect: (teamId: string) => void
}


export function TradeFinderTeamCards({ counts, context, deficits, ourTeamId, selectedTeamId, onSelect }: TeamCardsProps) {
  // Context also supplies opponents with zero candidates in a completed run.
  const teams = new Map(counts.map((team) => [team.team_id, team]))
  for (const team of Object.values(context?.teams ?? {})) {
    if (team.team_id !== ourTeamId && !teams.has(team.team_id)) {
      teams.set(team.team_id, { team_id: team.team_id, name: team.name, proposable: 0, needs_drop: 0, one_sided: 0 })
    }
  }
  return <div className="finder-team-strip" aria-label="Filter by team">
    <button type="button" className="finder-team-card" aria-pressed={!selectedTeamId} onClick={() => onSelect('')}>
      <span className="finder-team-card-title">All teams <span className="finder-count">{counts.reduce((n, t) => n + t.proposable, 0)}</span></span>
      <span>Proposable across the league</span>
    </button>
    {[...teams.values()].filter((team) => team.team_id !== ourTeamId).map((team) => {
      const h2h = headToHeadWeeks(context, team.team_id, ourTeamId)
      return <button type="button" key={team.team_id} className="finder-team-card" aria-pressed={selectedTeamId === team.team_id} onClick={() => onSelect(team.team_id)}>
        <span className="finder-team-card-title">{team.name} <span className={team.proposable ? 'finder-count' : 'finder-count finder-neutral'}>{team.proposable}</span></span>
        <span>{teamNeeds(deficits, team.team_id)}</span>
        <span className="finder-badges"><StrengthChip value={context?.teams[team.team_id]?.strength.z_score} />{h2h.length > 0 && <span className="finder-h2h">H2H wk {h2h.join(', ')}</span>}</span>
      </button>
    })}
  </div>
}
