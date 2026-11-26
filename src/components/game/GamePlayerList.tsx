import { useId, useState } from 'react'
import { Anchor, Badge, Group, Text } from '@mantine/core'
import { Link, useLocation } from 'react-router-dom'
import type { GamePlayer, GameStatus } from '../../api/types'
import { BreakdownTable } from '../player/BreakdownTable'
import { statLineText } from '../player/liveGameState'
import { formatPoints } from '../player/popoverFormat'
import { SCORING_PATH } from './gameRoutes'

interface Props {
  players: GamePlayer[]
  status: GameStatus | null
  onOpenPlayer: (playerId: string) => void
}

/** The matchup players in this game; each row expands into its scoring breakdown. */
export function GamePlayerList({ players, status, onOpenPlayer }: Props) {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set())
  const toggle = (playerId: string) => setOpen((current) => toggled(current, playerId))
  return (
    <section className="game-detail-column" aria-label="Matchup players in this game">
      <header className="game-detail-column-header">
        <h2>Matchup players in this game</h2>
        <span className="game-detail-hint">Select a player for the scoring breakdown</span>
      </header>
      {players.length === 0 ? (
        <p className="feed-empty">No matchup players in this game.</p>
      ) : (
        <ul className="game-detail-players">
          {players.map((player) => (
            <PlayerRow
              key={player.player_id}
              player={player}
              status={status}
              open={open.has(player.player_id)}
              onToggle={() => toggle(player.player_id)}
              onOpenPlayer={onOpenPlayer}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function toggled(set: ReadonlySet<string>, value: string): Set<string> {
  const next = new Set(set)
  if (!next.delete(value)) next.add(value)
  return next
}

interface RowProps {
  player: GamePlayer
  status: GameStatus | null
  open: boolean
  onToggle: () => void
  onOpenPlayer: (playerId: string) => void
}

function PlayerRow({ player, status, open, onToggle, onOpenPlayer }: RowProps) {
  const detailId = useId()
  const { search } = useLocation()
  return (
    <li className="game-detail-player">
      <button type="button" className="game-detail-toggle" aria-expanded={open} aria-controls={open ? detailId : undefined} onClick={onToggle}>
        <span className={`feed-stripe feed-stripe-${player.side}`} aria-hidden="true" />
        <PlayerIdentity player={player} />
        <PlayerPoints player={player} />
        <span className="game-detail-chevron" aria-hidden="true">›</span>
      </button>
      {open && (
        <div id={detailId} className="game-detail-breakdown">
          <Breakdown player={player} status={status} />
          <Group gap="md" mt="xs">
            <Anchor component={Link} to={{ pathname: SCORING_PATH, search }} size="sm">See all rules</Anchor>
            <Anchor component="button" type="button" size="sm" onClick={() => onOpenPlayer(player.player_id)}>Player card</Anchor>
          </Group>
        </div>
      )}
    </li>
  )
}

function PlayerIdentity({ player }: { player: GamePlayer }) {
  const meta = [player.position, player.team, statLineText(player.stat_line)].filter(Boolean).join(' · ')
  return (
    <span className="game-detail-identity">
      <span className="game-detail-name-row">
        <span className="game-detail-name">{player.player_name ?? 'Unknown player'}</span>
        <Badge component="span" size="xs" variant="outline" color={player.side === 'mine' ? 'teal' : 'orange'}>
          {player.side === 'mine' ? 'You' : 'Opp'}
        </Badge>
        {!player.starter && <Badge component="span" size="xs" variant="outline" color="gray">Bench</Badge>}
      </span>
      <span className="game-detail-meta">{meta}</span>
    </span>
  )
}

function PlayerPoints({ player }: { player: GamePlayer }) {
  return (
    <span className="game-detail-points">
      <span className="game-detail-points-label">Actual</span>
      <span className="game-detail-actual">{formatPoints(player.live_points)}</span>
      <span className="game-detail-projected">Proj {formatPoints(player.projected_points)}</span>
    </span>
  )
}

function Breakdown({ player, status }: { player: GamePlayer; status: GameStatus | null }) {
  if (status === 'not_started') return <Text size="sm" c="dimmed">No stats yet. This game hasn't started.</Text>
  if (!player.breakdown?.length) return <Text size="sm" c="dimmed">No scoring breakdown for this player.</Text>
  return <BreakdownTable lines={player.breakdown} />
}
