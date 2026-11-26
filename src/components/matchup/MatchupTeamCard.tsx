import type { MouseEvent } from 'react'
import { Table, Text } from '@mantine/core'
import type { MatchupTeamSide, PlayerLine } from '../../api/types'
import { playerOpener } from '../player/corePlayerIds'
import { DeficitBadge, SwapBadge } from '../player/DeficitBadge'
import { LiveBadge, NewsBadge } from '../player/LiveBadge'
import { LiveGameLine } from '../player/LiveGameLine'
import { PlayerCard } from '../player/PlayerCard'
import { PlayerNameButton } from '../player/PlayerNameButton'
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

/** What every player on a team card needs beyond its own line. */
interface PlayerExtras {
  onOpenPlayer?: (playerId: string) => void
  /** Recent-news flags keyed by core player id. */
  recentNews?: Record<string, boolean>
}

interface LineProps extends PlayerExtras {
  line: PlayerLine
  starter: boolean
}

function hasNews(line: PlayerLine, recentNews: Record<string, boolean> | undefined): boolean {
  return Boolean(line.core_player_id && recentNews?.[line.core_player_id])
}

/** A click handler for a player's whole row or card that leaves the controls inside it, the
 * name button included, to do their own job. */
function openFromSurface(open: (() => void) | undefined) {
  if (!open) return undefined
  return (event: MouseEvent) => {
    if (!(event.target as Element).closest('button, a, input, summary')) open()
  }
}

function PlayerRow({ line, starter, onOpenPlayer, recentNews }: LineProps) {
  const open = playerOpener(line, onOpenPlayer)
  return (
    <PlayerCard
      variant="tableRow"
      before={line.slot}
      className={open ? 'player-openable' : undefined}
      onClick={openFromSurface(open)}
      nameContent={<PlayerNameButton name={line.name} onOpen={open} />}
      player={{ id: line.player_id, name: line.name, position: line.position, espn: line.espn, live: line.live }}
      meta={<LiveGameLine live={line.live} team={line.pro_team} />}
      badges={
        <>
          <LiveBadge live={line.live} />
          <NewsBadge hasRecentNews={hasNews(line, recentNews)} />
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

function MobilePlayer({ line, starter, onOpenPlayer, recentNews }: LineProps) {
  const open = playerOpener(line, onOpenPlayer)
  return (
    <div className={`matchup-mobile-player${open ? ' player-openable' : ''}`} onClick={openFromSurface(open)}>
      <div>
        <Text size="xs" c="dimmed">{slotLabel(line.slot, line.position)}</Text>
        <Text fw={600}>
          <PlayerNameButton name={line.name} onOpen={open} />
          <LiveBadge live={line.live} />
          <NewsBadge hasRecentNews={hasNews(line, recentNews)} />
          {starter && isZeroProjection(line.projected_points) && (
            <span className="matchup-zero-flag" role="img" aria-label="Projected 0.0">!</span>
          )}
        </Text>
        <DeficitBadge isDeficit={line.deficit_flag} />
        <LiveGameLine live={line.live} team={line.pro_team} />
      </div>
      <Points line={line} />
    </div>
  )
}

interface ListProps extends PlayerExtras {
  lines: PlayerLine[]
  starter: boolean
}

function PlayerTable({ lines, header, ...rest }: ListProps & { header?: boolean }) {
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
        {lines.map((line) => <PlayerRow key={line.player_id} line={line} {...rest} />)}
      </Table.Tbody>
    </Table>
  )
}

/** One team's starters, plus its bench in a collapsed panel. Phones get player cards and wider
 * screens a table, switched in CSS. */
export function MatchupTeamCard({ side, label, id, ...extras }: PlayerExtras & { side: MatchupTeamSide; label: string; id: string }) {
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
        {side.starters.map((line) => <MobilePlayer key={line.player_id} line={line} starter {...extras} />)}
      </div>
      <PlayerTable lines={side.starters} starter header {...extras} />
      <details className="trade-section matchup-bench">
        <summary>Bench ({side.bench.length})</summary>
        <div className="matchup-player-cards">
          {side.bench.map((line) => <MobilePlayer key={line.player_id} line={line} starter={false} {...extras} />)}
        </div>
        <PlayerTable lines={side.bench} starter={false} header {...extras} />
      </details>
    </section>
  )
}
