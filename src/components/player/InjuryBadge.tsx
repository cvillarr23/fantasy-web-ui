import { BadgeSlot } from '../ui/BadgeSlot'

// ESPN's injuryStatus is a free-form string, not a closed enum in espn_api - map the
// common values to a short badge label/color, and fall back to showing the raw string
// for anything unrecognized rather than silently hiding it.
export const INJURY_BADGES: Record<string, { label: string; color: string }> = {
  QUESTIONABLE: { label: 'Q', color: 'yellow' },
  DOUBTFUL: { label: 'D', color: 'orange' },
  IR: { label: 'IR', color: 'red' },
  OUT: { label: 'O', color: 'red' },
  INJURY_RESERVE: { label: 'IR', color: 'red' },
  SUSPENSION: { label: 'SUSP', color: 'red' },
  DAY_TO_DAY: { label: 'DTD', color: 'yellow' },
}

// D/ST units report 'NORMAL' instead of 'ACTIVE' (they're not a person who gets injured) -
// confirmed live, not documented anywhere in espn_api.
export const HEALTHY_STATUSES = new Set(['ACTIVE', 'NORMAL', 'HEALTHY'])

// Statuses core's trade scoring (src/injury_timeline) holds out until a return week.
const SITS_UNTIL_RETURN = new Set(['OUT', 'INJURY_RESERVE', 'IR', 'SUSPENSION'])

/** Label and tooltip for a status, plus the expected return week when core sent one
 * (undefined means the caller has no timeline, so the badge stays the plain status). */
export function injuryBadge(status: string | null | undefined, returnWeek?: number | null) {
  if (!status || HEALTHY_STATUSES.has(status.toUpperCase())) return null
  const key = status.toUpperCase()
  const badge = INJURY_BADGES[key] ?? { label: status, color: 'yellow' }
  const text = status.replaceAll('_', ' ')
  if (returnWeek === undefined || !SITS_UNTIL_RETURN.has(key)) return { ...badge, tooltip: text }
  if (returnWeek === null)
    return { ...badge, label: `${badge.label} · return unknown`, tooltip: `${text}; ESPN gives no return date` }
  return { ...badge, label: `${badge.label} · back wk ${returnWeek}`, tooltip: `${text}; ESPN expects him back in week ${returnWeek}` }
}

export function InjuryBadge({ status, returnWeek }: { status: string | null | undefined; returnWeek?: number | null }) {
  const badge = injuryBadge(status, returnWeek)
  if (!badge) return null
  return <BadgeSlot label={badge.label} tooltip={badge.tooltip} color={badge.color} variant="filled" />
}
