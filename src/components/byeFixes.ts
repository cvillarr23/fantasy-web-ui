import type { TradeCandidate } from '../api/tradeCandidateTypes'
import type { WaiverRecommendation } from '../api/types'

export const FIXES_SHOWN = 2

/** Waiver pickups that core flagged as fill-ins for one of the crunch weeks, best first. */
export function byeFillIns(recommendations: WaiverRecommendation[], crunchWeeks: number[]): WaiverRecommendation[] {
  return recommendations
    .filter((rec) => rec.bye_fill && crunchWeeks.includes(rec.bye_fill.week))
    .sort((a, b) => (b.bye_fill?.lineup_gain ?? 0) - (a.bye_fill?.lineup_gain ?? 0))
    .slice(0, FIXES_SHOWN)
}

/** Proposable trades that fix at least one crunch week for us, best first (the list arrives sorted). */
export function byeTradeFixes(candidates: TradeCandidate[], crunchWeeks: number[]): TradeCandidate[] {
  return candidates
    .filter((candidate) => candidate.bye_coverage.us.fixed.some((week) => crunchWeeks.includes(week)))
    .slice(0, FIXES_SHOWN)
}
