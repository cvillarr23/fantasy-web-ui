import type { GameStatus, LiveBlock, MatchupResponse, MatchupTeamSide, PlayerLine } from '../../api/types'

/** How often the matchup and its feed refresh while a game is on. Each read also keeps core's
 * poller on its fast cadence. */
export const LIVE_POLL_MS = 30_000

/** The poll interval for a matchup: 30 s while any starter's game is in progress and the tab is
 * visible, otherwise off. */
export function pollInterval(matchup: MatchupResponse | null | undefined): number | false {
  if (!matchup || (typeof document !== 'undefined' && document.hidden)) return false
  return anyGameInProgress(matchup) ? LIVE_POLL_MS : false
}

function sides(matchup: MatchupResponse): MatchupTeamSide[] {
  return [matchup.our_team, matchup.opponent]
}

/** The status of the player's game: the poller's snapshot first, then the matchup's own field. */
function lineStatus(line: PlayerLine): GameStatus | null {
  return line.live?.status ?? line.game_status ?? null
}

export function anyGameInProgress(matchup: MatchupResponse): boolean {
  return sides(matchup).some((side) => [...side.starters, ...side.bench].some((line) => lineStatus(line) === 'in_progress'))
}

export interface SideCounts {
  playing: number
  yetToPlay: number
  /** Starters whose team has no game this week. */
  onBye: number
}

/** Starters in a game under way, starters yet to kick off, and starters on a bye. A finished
 * game, or one with no known status, counts toward none. */
export function sideCounts(side: MatchupTeamSide): SideCounts {
  const counts: SideCounts = { playing: 0, yetToPlay: 0, onBye: 0 }
  for (const line of side.starters) {
    const status = lineStatus(line)
    if (status === 'in_progress') counts.playing += 1
    else if (status === 'not_started') counts.yetToPlay += 1
    else if (status == null && line.bye_week != null) counts.onBye += 1
  }
  return counts
}

export interface GameTile {
  key: string
  /** Id for the Game details page; null while no snapshot in this game carries one. */
  eventId: string | null
  /** "TB @ ATL" before kickoff, otherwise "TB 14 – 17 ATL". */
  label: string
  status: GameStatus | null
  /** "Q3 8:42", "Final" or "Upcoming". */
  statusText: string
  /** Fantasy points from your starters in this game; null before any are known. */
  myPoints: number | null
  theirPoints: number | null
  myPlayers: string[]
  theirPlayers: string[]
}

function gameKey(live: LiveBlock): string | null {
  return live.away_abbr && live.home_abbr ? `${live.away_abbr}@${live.home_abbr}` : null
}

function gameLabel(live: LiveBlock): string {
  const matchup = `${live.away_abbr} @ ${live.home_abbr}`
  if (live.status === 'not_started' || live.away_score == null || live.home_score == null) return matchup
  return `${live.away_abbr} ${live.away_score} – ${live.home_score} ${live.home_abbr}`
}

function statusText(live: LiveBlock): string {
  if (live.status === 'final') return 'Final'
  if (live.status !== 'in_progress') return 'Upcoming'
  const quarter = live.period ? `Q${live.period}` : ''
  return [quarter, live.clock].filter(Boolean).join(' ') || 'Live'
}

function lastName(name: string): string {
  return name.trim().split(/\s+/).slice(-1)[0] ?? name
}

function addPoints(total: number | null, points: number | null): number | null {
  return points == null ? total : (total ?? 0) + points
}

/** One tile per NFL game that has a starter from either team, in order of first appearance
 * (your starters first). Points count starters only. */
export function matchupGames(matchup: MatchupResponse): GameTile[] {
  const tiles = new Map<string, GameTile>()
  const collect = (side: MatchupTeamSide, mine: boolean) => {
    for (const line of side.starters) {
      const key = line.live ? gameKey(line.live) : null
      if (!line.live || !key) continue
      const tile = tiles.get(key) ?? {
        key, eventId: null, label: gameLabel(line.live), status: line.live.status, statusText: statusText(line.live),
        myPoints: null, theirPoints: null, myPlayers: [], theirPlayers: [],
      }
      tile.eventId ??= line.live.event_id ?? null
      if (mine) {
        tile.myPoints = addPoints(tile.myPoints, line.live.live_points)
        tile.myPlayers.push(lastName(line.name))
      } else {
        tile.theirPoints = addPoints(tile.theirPoints, line.live.live_points)
        tile.theirPlayers.push(lastName(line.name))
      }
      tiles.set(key, tile)
    }
  }
  collect(matchup.our_team, true)
  collect(matchup.opponent, false)
  return [...tiles.values()]
}

/** The newest snapshot time across every player, as epoch milliseconds; null without one. */
export function latestUpdate(matchup: MatchupResponse): number | null {
  const times = sides(matchup)
    .flatMap((side) => [...side.starters, ...side.bench])
    .map((line) => (line.live?.updated_at ? Date.parse(line.live.updated_at) : NaN))
    .filter(Number.isFinite)
  return times.length ? Math.max(...times) : null
}

/** "Updated 12s ago", or minutes once it is a minute old. */
export function updatedAgo(updatedAt: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - updatedAt) / 1000))
  return seconds < 60 ? `Updated ${seconds}s ago` : `Updated ${Math.floor(seconds / 60)}m ago`
}
