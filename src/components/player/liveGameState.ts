import type { LiveBlock } from '../../api/types'

export type LiveState = 'live' | 'upcoming' | 'final' | 'none'

export const UNKNOWN = '—'

export interface LiveLineParts {
  /** `Q3 8:42` */
  clock: string
  /** `TB 14–17 ATL`, away first as on a scoreboard. */
  score: string
  /** `ATL ball · TB 12`; null when possession is unknown. */
  field: string | null
  redZone: boolean
}

/** Which of the card's game states a live block puts the player in. A bye player has no block (or
 * a null status), so they land in 'none' and keep the Bye badge instead of a dash. */
export function liveState(live: LiveBlock | null | undefined): LiveState {
  switch (live?.status) {
    case 'in_progress': return 'live'
    case 'not_started': return 'upcoming'
    case 'final': return 'final'
    default: return 'none'
  }
}

function num(value: number | null | undefined): string {
  return value === null || value === undefined ? UNKNOWN : String(value)
}

function periodLabel(period: number | null): string {
  if (period === null) return UNKNOWN
  return period > 4 ? 'OT' : `Q${period}`
}

function clockText(live: LiveBlock): string {
  const period = periodLabel(live.period)
  return live.clock ? `${period} ${live.clock}` : period
}

function scoreText(live: LiveBlock): string {
  const away = live.away_abbr ?? UNKNOWN
  const home = live.home_abbr ?? UNKNOWN
  return `${away} ${num(live.away_score)}–${num(live.home_score)} ${home}`
}

/** The matchup as a neutral line, `MIA @ BUF`, for when the player's team is unknown. */
export function matchupText(live: LiveBlock): string | null {
  return live.away_abbr && live.home_abbr ? `${live.away_abbr} @ ${live.home_abbr}` : null
}

function fieldText(live: LiveBlock): string | null {
  if (!live.possession) return null
  return live.yard_line ? `${live.possession} ball · ${live.yard_line}` : `${live.possession} ball`
}

/** The final result from the player's side, or the plain final score when their team is unknown. */
export function finalLineText(live: LiveBlock, team: string | null | undefined): string | null {
  return finalResultText(live, team) ?? (live.home_score === null || live.away_score === null ? null : scoreText(live))
}

export function liveLineParts(live: LiveBlock): LiveLineParts {
  return { clock: clockText(live), score: scoreText(live), field: fieldText(live), redZone: live.red_zone === true }
}

/** `vs GB` for a home game, `@ GB` for an away one; null when the teams are unknown. */
export function opponentText(live: LiveBlock, team: string | null | undefined): string | null {
  if (!team) return null
  if (team === live.home_abbr && live.away_abbr) return `vs ${live.away_abbr}`
  if (team === live.away_abbr && live.home_abbr) return `@ ${live.home_abbr}`
  return null
}

/** `Sun 4:25 PM` in the viewer's time zone; null without a valid kickoff. */
export function kickoffText(kickoff: string | null | undefined): string | null {
  if (!kickoff) return null
  const date = new Date(kickoff)
  if (Number.isNaN(date.getTime())) return null
  const day = date.toLocaleDateString('en-US', { weekday: 'short' })
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${day} ${time}`
}

function ownAndOpposingScore(live: LiveBlock, team: string): [number, number] | null {
  if (live.home_score === null || live.away_score === null) return null
  if (team === live.home_abbr) return [live.home_score, live.away_score]
  if (team === live.away_abbr) return [live.away_score, live.home_score]
  return null
}

/** `W 31–20 vs MIA`; null when the player's side of the score can't be told. */
export function finalResultText(live: LiveBlock, team: string | null | undefined): string | null {
  if (!team) return null
  const scores = ownAndOpposingScore(live, team)
  if (!scores) return null
  const [own, other] = scores
  const result = own > other ? 'W' : own < other ? 'L' : 'T'
  const opponent = opponentText(live, team)
  return opponent ? `${result} ${own}–${other} ${opponent}` : `${result} ${own}–${other}`
}

const STAT_PARTS: { keys: string[]; label: (stats: Record<string, number>) => string }[] = [
  { keys: ['passYd', 'passTD', 'int'], label: (s) => `${s.passYd ?? 0} pass yds${tail(s.passTD, 'TD')}${tail(s.int, 'INT')}` },
  { keys: ['rushYd', 'rushTD'], label: (s) => `${s.rushYd ?? 0} rush yds${tail(s.rushTD, 'TD')}` },
  { keys: ['rec', 'recYd', 'recTD'], label: (s) => `${s.rec ?? 0} rec ${s.recYd ?? 0} yds${tail(s.recTD, 'TD')}` },
  { keys: ['fumLost'], label: (s) => `${s.fumLost} fum lost` },
]

function tail(count: number | undefined, label: string): string {
  return count ? ` ${count} ${label}` : ''
}

/** A one-line summary of the stats recorded so far; empty when there are none. Only offensive
 * keys are summarised; other stat ids (kicking, defense) are left to the scoring breakdown. */
export function statLineText(stats: Record<string, number> | null | undefined): string {
  if (!stats) return ''
  return STAT_PARTS
    .filter(({ keys }) => keys.some((key) => stats[key]))
    .map(({ label }) => label(stats))
    .join(' · ')
}
