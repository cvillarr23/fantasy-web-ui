import { useState } from 'react'

interface Props {
  name: string
  headshotUrl: string
  /** Adds the pulsing dot that marks a player whose game is in progress. */
  live?: boolean
}

export function PlayerAvatar({ name, headshotUrl, live }: Props) {
  const avatar = <AvatarImage name={name} headshotUrl={headshotUrl} />
  if (!live) return avatar
  return (
    <span className="player-avatar-wrap">
      {avatar}
      <span className="player-avatar-dot" role="img" aria-label="Game in progress" />
    </span>
  )
}

function AvatarImage({ name, headshotUrl }: Props) {
  const [broken, setBroken] = useState(false)
  const initials = name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()

  if (broken) {
    return <span className="player-avatar player-avatar-fallback">{initials}</span>
  }
  return (
    <img
      className="player-avatar"
      src={headshotUrl}
      alt=""
      width={32}
      height={32}
      onError={() => setBroken(true)}
    />
  )
}
