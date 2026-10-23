import type { LineupPlayerLine, LineupRosterResponse } from '../api/types'
import { HEALTHY_STATUSES } from './player/InjuryBadge'

export interface Suggestion {
  starter: LineupPlayerLine
  benchPlayer: LineupPlayerLine
  vorpDelta: number
  explanation?: string | null
}

// Statuses that make sitting the starter close to mandatory, regardless of VORP delta.
const SEVERE_STATUSES = new Set(['OUT', 'INJURY_RESERVE', 'SUSPENSION', 'DOUBTFUL'])

function injurySeverity(status: string | null): number {
  if (!status || HEALTHY_STATUSES.has(status)) return 0
  if (SEVERE_STATUSES.has(status)) return 2
  return 1 // QUESTIONABLE, DAY_TO_DAY, or any other flagged-but-unrecognized status
}

export function buildSuggestions(roster: LineupRosterResponse): Suggestion[] {
  const suggestions: Suggestion[] = []
  for (const starter of roster.starters) {
    if (!starter.suggested_swap) continue
    const benchPlayer = roster.bench.find((p) => p.player_id === starter.suggested_swap!.add_player_id && p.slot !== 'IR')
    if (!benchPlayer) continue
    suggestions.push({
      starter,
      benchPlayer,
      vorpDelta: (benchPlayer.net_vorp ?? 0) - (starter.net_vorp ?? 0),
      explanation: starter.suggested_swap.explanation,
    })
  }
  return suggestions.sort((a, b) => {
    const severityDiff = injurySeverity(b.starter.injury_status) - injurySeverity(a.starter.injury_status)
    return severityDiff !== 0 ? severityDiff : b.vorpDelta - a.vorpDelta
  })
}
