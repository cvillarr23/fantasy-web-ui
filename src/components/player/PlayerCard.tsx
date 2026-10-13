import type { CSSProperties, ReactNode, Ref } from 'react'
import { Table, UnstyledButton } from '@mantine/core'
import { PlayerAvatar } from './PlayerAvatar'

export interface PlayerCardData {
  id: string
  name: string
  position?: string | null
  team?: string | null
  headshotUrl?: string | null
  jersey?: string | number | null
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
  onClick?: () => void
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
  disabled,
  ariaLabel,
  innerRef,
  dragHandleProps,
  style,
  className,
}: Props) {
  const metaContent = meta ?? defaultMeta(player)
  const avatar = player.headshotUrl ? <PlayerAvatar name={player.name} headshotUrl={player.headshotUrl} /> : null

  if (variant === 'tableRow') {
    return (
      <Table.Tr>
        {before !== undefined && <Table.Td>{before}</Table.Td>}
        {player.headshotUrl !== undefined && <Table.Td>{avatar}</Table.Td>}
        <Table.Td>
          {player.name}
          {badgeGroup(badges)}
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
        className={`player-card ${className ?? ''}`}
        role="button"
        tabIndex={0}
      >
        {avatar}
        <div className="player-card-info">
          <span className="player-card-name">
            {player.name}
            {badges}
          </span>
          <span className="player-card-meta">
            {metaContent}
            {stats !== undefined && stats !== null && <> · {stats}</>}
          </span>
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
    </div>
  )
}
