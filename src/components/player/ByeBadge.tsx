import { BadgeSlot } from '../ui/BadgeSlot'
import { byeBadgeState } from './byeBadgeState'

/** A player's NFL bye: a red "BYE" in his bye week, a quiet "Bye Wk N" before it. */
export function ByeBadge({ byeWeek, week }: { byeWeek?: number | null; week?: number | null }) {
  const state = byeBadgeState(byeWeek, week)
  if (state === 'this_week')
    return <BadgeSlot label="BYE" tooltip={`On bye in week ${byeWeek}: scores nothing this week`} color="red" variant="filled" />
  if (state === 'upcoming')
    return <BadgeSlot label={`Bye Wk ${byeWeek}`} tooltip={`NFL bye in week ${byeWeek}`} color="gray" variant="light" />
  return null
}
