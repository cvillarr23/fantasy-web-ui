import { Table, Text } from '@mantine/core'
import type { MatchupTeamSide, PlayerLine } from '../../api/types'
import { DeficitBadge, SwapBadge } from '../player/DeficitBadge'
import { PlayerCard } from '../player/PlayerCard'
import { BadgeSlot } from '../ui/BadgeSlot'
import { ScoreValue } from '../ui/ScoreValue'
import { isZeroProjection, knownScore, slotLabel } from './matchupFormat'
import { matchupGlossary } from './matchupGlossary'
import { TeamLogo } from './TeamLogo'

const COLUMNS = ['Slot', 'Player', 'Pos', 'Actual', 'Projected']

function Points({ line }: { line: PlayerLine }) {
  return (
    <span className="score-pair">
      <ScoreValue value={knownScore(line.points)} />
      <ScoreValue value={line.projected_points} projected flagZero />
    </span>
  )
}

function PlayerRow({ line, starter }: { line: PlayerLine; starter: boolean }) {
  return (
    <PlayerCard
      variant="tableRow"
      before={line.slot}
      player={{ id: line.player_id, name: line.name, position: line.position }}
      badges={
        <>
          <DeficitBadge isDeficit={line.deficit_flag} />
          <SwapBadge benchFor={line.suggested_swap?.bench_for} />
          {starter && isZeroProjection(line.projected_points) && (
            <BadgeSlot label="Projected 0.0" tooltip={matchupGlossary.zeroProjection} color="red" />
          )}
        </>
      }
      columns={[
        <ScoreValue key="actual" value={knownScore(line.points)} />,
        <ScoreValue key="projected" value={line.projected_points} projected flagZero />,
      ]}
    />
  )
}

function MobilePlayer({ line, starter }: { line: PlayerLine; starter: boolean }) {
  return (
    <div className="matchup-mobile-player">
      <div>
        <Text size="xs" c="dimmed">{slotLabel(line.slot, line.position)}</Text>
        <Text fw={600}>
          {line.name}
          {starter && isZeroProjection(line.projected_points) && (
            <span className="matchup-zero-flag" role="img" aria-label="Projected 0.0">!</span>
          )}
        </Text>
        <DeficitBadge isDeficit={line.deficit_flag} />
      </div>
      <Points line={line} />
    </div>
  )
}

function PlayerTable({ lines, starter, header }: { lines: PlayerLine[]; starter: boolean; header?: boolean }) {
  return (
    <Table striped className="desktop-matchup-table">
      {header && (
        <Table.Thead>
          <Table.Tr>
            {COLUMNS.map((heading) => <Table.Th key={heading}>{heading}</Table.Th>)}
          </Table.Tr>
        </Table.Thead>
      )}
      <Table.Tbody>
        {lines.map((line) => <PlayerRow key={line.player_id} line={line} starter={starter} />)}
      </Table.Tbody>
    </Table>
  )
}

/** One team's starters, plus its bench in a collapsed panel. Phones get player cards and wider
 * screens a table, switched in CSS. */
export function MatchupTeamCard({ side, label, id }: { side: MatchupTeamSide; label: string; id: string }) {
  return (
    <section id={id} className="matchup-team-card" aria-label={`${label}: ${side.team.name}`}>
      <header className="matchup-team-header">
        <TeamLogo name={side.team.name} url={side.team.logo_url} />
        <div>
          <div className="matchup-team-label">{label}</div>
          <h2>{side.team.name}</h2>
        </div>
      </header>
      <div className="matchup-player-cards">
        {side.starters.map((line) => <MobilePlayer key={line.player_id} line={line} starter />)}
      </div>
      <PlayerTable lines={side.starters} starter header />
      <details className="trade-section matchup-bench">
        <summary>Bench ({side.bench.length})</summary>
        <div className="matchup-player-cards">
          {side.bench.map((line) => <MobilePlayer key={line.player_id} line={line} starter={false} />)}
        </div>
        <PlayerTable lines={side.bench} starter={false} header />
      </details>
    </section>
  )
}
