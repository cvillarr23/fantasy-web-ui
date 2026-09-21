import { Badge, Tooltip } from '@mantine/core'

// ESPN's injuryStatus is a free-form string, not a closed enum in espn_api - map the
// common values to a short badge label/color, and fall back to showing the raw string
// for anything unrecognized rather than silently hiding it.
export const INJURY_BADGES: Record<string, { label: string; color: string }> = {
  QUESTIONABLE: { label: 'Q', color: 'yellow' },
  DOUBTFUL: { label: 'D', color: 'orange' },
  OUT: { label: 'O', color: 'red' },
  INJURY_RESERVE: { label: 'IR', color: 'red' },
  SUSPENSION: { label: 'SUSP', color: 'red' },
  DAY_TO_DAY: { label: 'DTD', color: 'yellow' },
}

// D/ST units report 'NORMAL' instead of 'ACTIVE' (they're not a person who gets injured) -
// confirmed live, not documented anywhere in espn_api.
export const HEALTHY_STATUSES = new Set(['ACTIVE', 'NORMAL'])

export function InjuryBadge({ status }: { status: string | null }) {
  if (!status || HEALTHY_STATUSES.has(status)) return null
  const badge = INJURY_BADGES[status] ?? { label: status, color: 'yellow' }
  return (
    <Tooltip label={status.replaceAll('_', ' ')}>
      <Badge color={badge.color} size="xs">{badge.label}</Badge>
    </Tooltip>
  )
}
