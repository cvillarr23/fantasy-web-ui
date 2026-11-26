import type { GameDetailResponse, LiveBlock, LiveGame } from '../../api/types'
import { LIVE_POLL_MS } from '../matchup/matchupLive'

export interface SplitShares {
  /** Percent of the split bar, 0 to 100. */
  mine: number
  theirs: number
}

/** Each side's share of the points scored in the game. A negative or unknown total takes no
 * width, and the bar stays empty until someone has scored. */
export function splitShares(mine: number | null, theirs: number | null): SplitShares {
  const ours = Math.max(0, mine ?? 0)
  const opponents = Math.max(0, theirs ?? 0)
  const total = ours + opponents
  if (total === 0) return { mine: 0, theirs: 0 }
  const share = Math.round((ours / total) * 1000) / 10
  return { mine: share, theirs: 100 - share }
}

/** The game as a player's live block, so the header words the clock, ball and kickoff the same
 * way the player cards do. */
export function asLiveBlock(game: LiveGame): LiveBlock {
  const { status, period, clock, possession, yard_line, red_zone, kickoff, updated_at } = game
  return {
    status, period, clock, possession, yard_line, red_zone, kickoff, updated_at,
    away_abbr: game.away.abbr, away_score: game.away.score,
    home_abbr: game.home.abbr, home_score: game.home.score,
    stat_line: null, live_points: null,
  }
}

/** Past its kickoff time but not yet reported as started, so the next read may be the one that
 * shows it under way. */
function dueToKickOff(game: LiveGame, now: number): boolean {
  return game.status === 'not_started' && game.kickoff != null && Date.parse(game.kickoff) <= now
}

/** Every 30s while the game is on (or due to start) and the tab is visible, otherwise off. */
export function gamePollInterval(detail: GameDetailResponse | null | undefined, now = Date.now()): number | false {
  if (!detail || document.hidden) return false
  const live = detail.game.status === 'in_progress' || dueToKickOff(detail.game, now)
  return live ? LIVE_POLL_MS : false
}
