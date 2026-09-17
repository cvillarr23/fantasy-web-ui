import { useState } from 'react'

interface Props {
  name: string
  headshotUrl: string
}

export function PlayerAvatar({ name, headshotUrl }: Props) {
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
