import type { EspnOwnership } from '../../api/types'

/** Start% below this marks a player as one ESPN managers mostly bench. */
export const COLD_START_PERCENT = 25
/** How many points the give side's mean start% must lead the get side's to warn. */
export const HEADS_UP_GAP = 25

type EspnLike = EspnOwnership | null | undefined

export function hasEspnData(espn: EspnLike): espn is EspnOwnership {
  return !!espn && Object.values(espn).some((value) => value !== null && value !== undefined)
}

export function isCold(espn: EspnLike): boolean {
  const started = espn?.percent_started
  return started !== null && started !== undefined && started < COLD_START_PERCENT
}

export function formatPosRank(position: string | null | undefined, rank: number | null | undefined): string | null {
  if (rank === null || rank === undefined) return null
  return position ? `${position}${rank}` : `#${rank}`
}

export function formatChange(change: number | null | undefined): { text: string; tone: 'up' | 'down' } | null {
  const points = Math.round(change ?? 0)
  if (points === 0) return null
  return points > 0 ? { text: `▲${points}`, tone: 'up' } : { text: `▼${-points}`, tone: 'down' }
}

function percent(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${Math.round(value)}%`
}

export function espnTooltip(espn: EspnOwnership): string {
  return `ESPN, all leagues: ${percent(espn.percent_owned)} rostered, ${percent(espn.percent_started)} started, ${percent(espn.percent_bench)} benched`
}

interface HasEspn {
  espn?: EspnOwnership | null
}

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']

function count(n: number, singular: string, plural: string): string {
  return `${WORDS[n] ?? n} ${n === 1 ? singular : plural}`
}

function startedValues(players: HasEspn[]): number[] {
  return players.flatMap((p) => (p.espn?.percent_started ?? null) === null ? [] : [p.espn!.percent_started!])
}

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function percentList(values: number[]): string {
  return values.map((v) => `${Math.round(v)}%`).join(', ')
}

function getSideSummary(starts: number[]): string {
  const cold = starts.filter((v) => v < COLD_START_PERCENT)
  const starters = starts.length - cold.length
  const coldPart = `${count(cold.length, 'player who is', 'players who are')} mostly benched (${percentList(cold)} start)`
  return starters > 0 ? `${count(starters, 'starter', 'starters')} and ${coldPart}` : coldPart
}

/**
 * Warns when the side you give is started far more than the side you get and the get
 * side holds a player ESPN managers mostly bench. Players without start% are ignored.
 */
export function tradeHeadsUp(give: HasEspn[], get: HasEspn[]): { message: string } | null {
  const giveStarts = startedValues(give)
  const getStarts = startedValues(get)
  if (giveStarts.length === 0 || getStarts.length === 0) return null
  if (!getStarts.some((v) => v < COLD_START_PERCENT)) return null
  if (mean(giveStarts) - mean(getStarts) < HEADS_UP_GAP) return null
  const sent = count(giveStarts.length, 'player', 'players')
  return {
    message: `You'd send ${sent} ESPN managers start (${percentList(giveStarts)}) for ${getSideSummary(getStarts)}.`,
  }
}

export type EspnSortKey = 'rank' | 'start' | 'bench' | 'change'

const SORT_FIELD: Record<EspnSortKey, keyof EspnOwnership> = {
  rank: 'pos_rank',
  start: 'percent_started',
  bench: 'percent_bench',
  change: 'percent_change',
}

/** Rank 1 is best, so it sorts ascending first; the percentages sort highest first. */
const FIRST_DIRECTION: Record<EspnSortKey, 'asc' | 'desc'> = { rank: 'asc', start: 'desc', bench: 'desc', change: 'desc' }

export interface EspnSort {
  key: EspnSortKey
  direction: 'asc' | 'desc'
}

/** The next sort after clicking a column: first its natural direction, then reversed, then off. */
export function nextEspnSort(current: EspnSort | null, key: EspnSortKey): EspnSort | null {
  if (current?.key !== key) return { key, direction: FIRST_DIRECTION[key] }
  if (current.direction === FIRST_DIRECTION[key]) return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
  return null
}

/** Sorts a copy by one ESPN field; rows without the value always go last. */
export function sortByEspn<T>(rows: T[], getEspn: (row: T) => EspnLike, sort: EspnSort | null): T[] {
  if (!sort) return rows
  const field = SORT_FIELD[sort.key]
  const sign = sort.direction === 'asc' ? 1 : -1
  const value = (row: T) => getEspn(row)?.[field] ?? null
  return [...rows].sort((a, b) => {
    const [x, y] = [value(a), value(b)]
    if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1
    return sign * (x - y)
  })
}
