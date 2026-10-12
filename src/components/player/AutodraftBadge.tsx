import { BadgeSlot } from '../ui/BadgeSlot'

export function AutodraftBadge({ isSuspected }: { isSuspected: boolean }) {
  if (!isSuspected) return null
  return (
    <BadgeSlot
      label="⚠ ESPN autodraft"
      tooltip="Our system's attempted pick was never confirmed - ESPN autodrafted for us instead."
      color="red"
    />
  )
}
