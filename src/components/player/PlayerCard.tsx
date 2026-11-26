import type { CSSProperties, MouseEvent, ReactNode, Ref } from 'react'
import { Table, UnstyledButton } from '@mantine/core'
import type { EspnOwnership, LiveBlock } from '../../api/types'
import { EspnMarketLine } from './EspnMarketLine'
import { liveState } from './liveGameState'
import { PlayerAvatar } from './PlayerAvatar'

export interface PlayerCardData {
  id: string
  name: string
  position?: string | null
  team?: string | null
  headshotUrl?: string | null
  jersey?: string | number | null
  espn?: EspnOwnership | null
  /** Core's live snapshot; a game in progress adds the avatar dot and a green-tinted border. */
  live?: LiveBlock | null
}

type PlayerCardVariant = 'row' | 'tableRow' | 'card' | 'listItem'

interface Props {
  player: PlayerCardData
  variant: PlayerCardVariant
  stats?: ReactNode
  badges?: ReactNode
  meta?: ReactNode
  before?: ReactNode
  after?: ReactNode
  /** tableRow only: extra trailing columns, each rendered as its own <Table.Td>. Overrides jersey/stats/after when given. */
  columns?: ReactNode[]
  /** listItem: the button's click. tableRow: a click anywhere on the row. */
  onClick?: (event: MouseEvent) => void
  /** card and tableRow: replaces the plain name, such as with a button. */
  nameContent?: ReactNode
  disabled?: boolean
  ariaLabel?: string
  innerRef?: Ref<HTMLDivElement>
  dragHandleProps?: Record<string, unknown>
  style?: CSSProperties
  className?: string
}

function defaultMeta(player: PlayerCardData): ReactNode {
  const parts = [player.position, player.team].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
}

/** The default position and team share a line with `stats`. The non-breaking space keeps a wrap
 * from starting the next line with the separator. */
function inlineDetails(identity: ReactNode, stats: ReactNode): ReactNode {
  if (!identity || !stats) return identity || stats
  return <>{identity}{'\u00a0· '}{stats}</>
}

/** The details under a card's name. A caller's `meta`, such as a game line, is a block of its own,
 * so `stats` goes beneath it with nothing to separate. */
function cardDetails(player: PlayerCardData, meta: ReactNode, stats: ReactNode): ReactNode {
  if (!meta) return inlineDetails(defaultMeta(player), stats)
  return <>{meta}{stats && <span className="player-card-stats">{stats}</span>}</>
}

function badgeGroup(badges: ReactNode): ReactNode {
  if (!badges) return null
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 6 }}>{badges}</span>
}

export function PlayerCard({
  player,
  variant,
  stats,
  badges,
  meta,
  before,
  after,
  columns,
  onClick,
  nameContent,
  disabled,
  ariaLabel,
  innerRef,
  dragHandleProps,
  style,
  className,
}: Props) {
  const metaContent = meta ?? defaultMeta(player)
  const espnLine = <EspnMarketLine position={player.position} espn={player.espn} />
  const isLive = liveState(player.live) === 'live'
  const avatar = player.headshotUrl ? <PlayerAvatar name={player.name} headshotUrl={player.headshotUrl} live={isLive} /> : null

  if (variant === 'tableRow') {
    return (
      <Table.Tr onClick={onClick} className={className}>
        {before !== undefined && <Table.Td>{before}</Table.Td>}
        {player.headshotUrl !== undefined && <Table.Td>{avatar}</Table.Td>}
        <Table.Td>
          {nameContent ?? player.name}
          {badgeGroup(badges)}
          {meta && <div>{meta}</div>}
          {espnLine}
        </Table.Td>
        <Table.Td>{player.position}</Table.Td>
        {columns
          ? columns.map((column, i) => <Table.Td key={i}>{column}</Table.Td>)
          : <>
              {player.jersey !== undefined && <Table.Td>{player.jersey ?? '—'}</Table.Td>}
              {stats !== undefined && <Table.Td>{stats}</Table.Td>}
              {after !== undefined && <Table.Td>{after}</Table.Td>}
            </>}
      </Table.Tr>
    )
  }

  if (variant === 'listItem') {
    return (
      <li className={`pick-row ${className ?? ''}`}>
        <UnstyledButton
          className="pick-row-button"
          onClick={onClick}
          disabled={disabled}
          aria-label={ariaLabel}
        >
          {before}
          <span className="pick-name">{player.name}</span>
          {player.position && <span className="pick-position">{player.position}</span>}
          {player.team && <span className="pick-pro-team">{player.team}</span>}
          {after}
          {badgeGroup(badges)}
        </UnstyledButton>
      </li>
    )
  }

  if (variant === 'card') {
    return (
      <div
        ref={innerRef}
        style={style}
        {...dragHandleProps}
        className={`player-card ${isLive ? 'is-live' : ''} ${className ?? ''}`}
        role="button"
        tabIndex={0}
      >
        {avatar}
        <div className="player-card-info">
          <div className="player-card-head">
            <div className="player-card-title">
              <span className="player-card-name">
                {nameContent ?? player.name}
                {badges}
              </span>
              <span className="player-card-meta">{cardDetails(player, meta, stats)}</span>
            </div>
            {after !== undefined && <div className="player-card-after">{after}</div>}
          </div>
          {espnLine}
        </div>
      </div>
    )
  }

  // variant === 'row': compact generic fallback
  return (
    <div className={`player-card-row ${className ?? ''}`}>
      {avatar}
      <span className="player-card-row-name">{player.name}</span>
      {metaContent && <span className="player-card-row-meta">{metaContent}</span>}
      {stats}
      {badges}
      {espnLine}
    </div>
  )
}
