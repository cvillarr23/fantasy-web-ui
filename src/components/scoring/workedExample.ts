import type { MatchupResponse, MatchupTeamSide, PlayerLine, ScoreBreakdownLine, ScoringRule } from '../../api/types'
import { breakdownTotal, formatQty } from '../player/popoverFormat'

/** How far qty × rule may sit from ESPN's points before the sum would read as wrong. */
const SUM_TOLERANCE = 0.05

export interface ExamplePlayer {
  id: string
  name: string
  position: string
  points: number
  lines: ScoreBreakdownLine[]
}

export interface ExamplePlayers {
  mine: ExamplePlayer[]
  theirs: ExamplePlayer[]
}

function examplePlayer(line: PlayerLine): ExamplePlayer[] {
  const lines = line.live?.breakdown
  if (!lines?.length) return []
  const points = line.live?.live_points ?? breakdownTotal(lines)
  return [{ id: line.player_id, name: line.name, position: line.position, points, lines }]
}

function sidePlayers(side: MatchupTeamSide): ExamplePlayer[] {
  return [...side.starters, ...side.bench].flatMap(examplePlayer)
}

/** Everyone in the matchup, bench included, with a scoring breakdown to walk through. */
export function examplePlayers(matchup: MatchupResponse): ExamplePlayers {
  return { mine: sidePlayers(matchup.our_team), theirs: sidePlayers(matchup.opponent) }
}

function highestScorer(players: ExamplePlayer[]): ExamplePlayer | undefined {
  return [...players].sort((a, b) => b.points - a.points)[0]
}

/** Your highest scorer; an opponent's only when none of yours has scored. */
export function defaultExampleId({ mine, theirs }: ExamplePlayers): string | null {
  return (highestScorer(mine) ?? highestScorer(theirs))?.id ?? null
}

/** The rule for the player's position, else the one for everyone. */
function ruleFor(line: ScoreBreakdownLine, position: string, rules: ScoringRule[]): ScoringRule | undefined {
  const matching = rules.filter((rule) => rule.stat_key === line.stat_key)
  return matching.find((rule) => rule.position === position) ?? matching.find((rule) => rule.position === null)
}

/** Up to two decimals with a true minus sign: one decimal would show a 0.04 rule as 0.0. */
function exact(value: number): string {
  return String(Math.round(value * 100) / 100).replace('-', '−')
}

/** "Rushing yards: 78 yds × 0.1 = 7.8", or null for a line that isn't a plain multiplication:
 * a range stat, the unitemized remainder, or points ESPN didn't get by multiplying. */
function multiplication(line: ScoreBreakdownLine, rule: ScoringRule | undefined): string | null {
  if (!rule || line.qty == null || !line.unit) return null
  if (Math.abs(line.qty * rule.points_per - line.points) > SUM_TOLERANCE) return null
  return `${line.label}: ${formatQty(line)} × ${exact(rule.points_per)} = ${exact(line.points)}`
}

/** The multiplication behind the player's biggest stat that has one. */
export function multiplyStep(player: ExamplePlayer, rules: ScoringRule[]): string | null {
  const biggestFirst = [...player.lines].sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
  for (const line of biggestFirst) {
    const sum = multiplication(line, ruleFor(line, player.position, rules))
    if (sum) return sum
  }
  return null
}
