import type { MatchupTeamInfo } from '../../api/types'
import { InfoTip } from '../ui/InfoTip'
import { ScoreValue } from '../ui/ScoreValue'
import { StatTile } from '../ui/StatTile'
import { displayWinChance, knownScore, projectedMargin } from './matchupFormat'
import type { SideCounts } from './matchupLive'
import { matchupGlossary } from './matchupGlossary'
import { TeamLogo } from './TeamLogo'

function countsText({ playing, yetToPlay, onBye }: SideCounts): string {
  const text = `${playing} playing · ${yetToPlay} yet to play`
  return onBye > 0 ? `${text} · ${onBye} on bye` : text
}

function TeamTotals({ team, label, align, counts }: { team: MatchupTeamInfo; label: string; align: 'start' | 'end'; counts?: SideCounts }) {
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
        {counts && <div className="matchup-summary-counts">{countsText(counts)}</div>}
      </div>
    </div>
  )
}

/** Both totals side by side, with the projected margin and an estimated win chance between them. */
export function MatchupSummary({ ours, opponent, oursCounts, opponentCounts }: {
  ours: MatchupTeamInfo
  opponent: MatchupTeamInfo
  oursCounts?: SideCounts
  opponentCounts?: SideCounts
}) {
  const margin = projectedMargin(ours.projected, opponent.projected)
  const chance = displayWinChance(ours, margin)
  return (
    <section id="matchup-summary" className="matchup-summary" aria-label="Matchup summary">
      <TeamTotals team={ours} label="Your team" align="start" counts={oursCounts} />
      <div className="matchup-summary-middle">
        <StatTile label="Projected margin" value={margin} info={matchupGlossary.margin} />
        <div className="matchup-win">
          <div className="stat-tile-label">Win chance <InfoTip label="win chance">{matchupGlossary.winChance}</InfoTip></div>
          <div className="matchup-win-value">{chance == null ? '—' : `~${chance}%`}</div>
          {chance != null && (
            <div className="matchup-win-bar" aria-hidden="true"><span style={{ width: `${chance}%` }} /></div>
          )}
          <div className="stat-tile-caption">{ours.win_probability == null ? 'Estimate from projected totals' : "ESPN's live win probability"}</div>
        </div>
      </div>
      <TeamTotals team={opponent} label="Opponent" align="end" counts={opponentCounts} />
    </section>
  )
}
