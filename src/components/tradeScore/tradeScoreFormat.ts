import type { ProposalEvaluation, TradeScoreLineupWeek, TradeScoreRequest, TradeScoreStarter } from '../../api/types'

/** Formats a value core returned. A missing value is unknown, so it never reads as zero. */
export function signedScore(value: number | null | undefined, digits = 1): string {
  if (value == null) return 'Not available'
  const text = value.toFixed(digits)
  return value > 0 ? `+${text}` : text
}

export function lineupMoves(week: TradeScoreLineupWeek): { entered: TradeScoreStarter[]; left: TradeScoreStarter[] } {
  const before = new Set(week.starters_before.map((s) => s.espn_id))
  const after = new Set(week.starters_after.map((s) => s.espn_id))
  return {
    entered: week.starters_after.filter((s) => !before.has(s.espn_id)),
    left: week.starters_before.filter((s) => !after.has(s.espn_id)),
  }
}

/** Identifies what a score was computed for, so a result is never shown for other inputs. */
export function scoreInputSignature(request: TradeScoreRequest): string {
  return JSON.stringify({
    ...request,
    send_espn_ids: [...request.send_espn_ids].sort(),
    receive_espn_ids: [...request.receive_espn_ids].sort(),
  })
}

/** RFC 6901 lookup; pitch evidence cites score fields by pointer. */
export function resolvePointer(document: unknown, pointer: string): unknown {
  if (!pointer.startsWith('/')) return undefined
  let current = document
  for (const raw of pointer.slice(1).split('/')) {
    const key = raw.replace(/~1/g, '/').replace(/~0/g, '~')
    if (current === null || typeof current !== 'object' || !Object.hasOwn(current, key)) return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

/** Stored evidence is rendered only in the versions this page understands; anything else
 * would risk misreading its fields. */
export function isProposalEvaluation(value: unknown): value is ProposalEvaluation {
  if (!value || typeof value !== 'object') return false
  const evaluation = value as Partial<ProposalEvaluation>
  const score = evaluation.score as Partial<ProposalEvaluation['score']> | undefined
  return evaluation.version === 'proposal-evaluation-v1'
    && !!evaluation.request
    && !!score && score.scoring_version === 'trade-score-v1'
    && !!score.score && !!score.horizon && !!score.raw_vorp && !!score.roster_impact
    && !!score.schedule && !!score.coverage && !!score.weights
}
