import { BadgeSlot } from './BadgeSlot'

const TOOLTIP = 'Current pipeline value, not a snapshot from pick time'

export function ScarcityBadge({ isScarce }: { isScarce: boolean }) {
  if (!isScarce) return null
  return <BadgeSlot label="scarcity-driven" tooltip={TOOLTIP} color="yellow" />
}

export function MatchupBadge({ coefficient }: { coefficient: number | null | undefined }) {
  if (coefficient == null) return null
  return <BadgeSlot label={`matchup ${coefficient.toFixed(2)}x`} tooltip={TOOLTIP} color="blue" />
}
