import { BadgeSlot } from '../ui/BadgeSlot'
import { liveState, type LiveState } from './liveGameState'
import type { LiveBlock } from '../../api/types'

/** The Live or Final badge for a player's game; nothing before kickoff or without a game. */
export function LiveBadge({ live }: { live: LiveBlock | null | undefined }) {
  return <GameStateBadge state={liveState(live)} />
}

function GameStateBadge({ state }: { state: LiveState }) {
  if (state === 'live') return <BadgeSlot label="Live" tooltip="Game in progress" color="green" variant="light" />
  if (state === 'final') return <BadgeSlot label="Final" tooltip="Game is over" color="gray" variant="outline" />
  return null
}

/** Shown when the player has news under 24 hours old. */
export function NewsBadge({ hasRecentNews }: { hasRecentNews?: boolean }) {
  if (!hasRecentNews) return null
  return <BadgeSlot label="News" tooltip="News in the last 24 hours" color="clay" variant="outline" />
}
