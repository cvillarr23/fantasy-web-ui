import type { MatchupTeamInfo } from '../../api/types'
import { InfoTip } from '../ui/InfoTip'
import { ScoreValue } from '../ui/ScoreValue'
import { StatTile } from '../ui/StatTile'
import { knownScore, projectedMargin, winChance } from './matchupFormat'
import { matchupGlossary } from './matchupGlossary'
import { TeamLogo } from './TeamLogo'

function TeamTotals({ team, label, align }: { team: MatchupTeamInfo; label: string; align: 'start' | 'end' }) {
  return (
    <div className={`matchup-summary-team matchup-summary-team-${align}`}>
      <TeamLogo name={team.name} url={team.logo_url} />
      <div>
        <div className="matchup-team-label">{label}</div>
        <div className="matchup-summary-name">{team.name}</div>
        <span className="score-pair">
          <ScoreValue value={knownScore(team.score)} />
          <ScoreValue value={team.projected} projected />
        </span>
      </div>
    </div>
  )
}

/** Both totals side by side, with the projected margin and an estimated win chance between them. */
export function MatchupSummary({ ours, opponent }: { ours: MatchupTeamInfo; opponent: MatchupTeamInfo }) {
  const margin = projectedMargin(ours.projected, opponent.projected)
  const chance = winChance(margin)
  return (
    <section id="matchup-summary" className="matchup-summary" aria-label="Matchup summary">
      <TeamTotals team={ours} label="Your team" align="start" />
      <div className="matchup-summary-middle">
        <StatTile label="Projected margin" value={margin} info={matchupGlossary.margin} />
        <div className="matchup-win">
          <div className="stat-tile-label">Win chance <InfoTip label="win chance">{matchupGlossary.winChance}</InfoTip></div>
          <div className="matchup-win-value">{chance == null ? '—' : `~${chance}%`}</div>
          {chance != null && (
            <div className="matchup-win-bar" aria-hidden="true"><span style={{ width: `${chance}%` }} /></div>
          )}
          <div className="stat-tile-caption">Estimate from projected totals</div>
        </div>
      </div>
      <TeamTotals team={opponent} label="Opponent" align="end" />
    </section>
  )
}
