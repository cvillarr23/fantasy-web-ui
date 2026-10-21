import { reasonLabel } from './tradeScoreReasons'
import type { ProposalEvaluation, TradeScore, TradeScoreLineupWeek, TradeScoreRequest, TradeScoreStarter } from '../../api/types'

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

/** Readable text for the score value a pitch-evidence pointer resolves to. The generator
 * cites whole traded players, starters and unscored weeks as well as plain numbers. */
export function formatEvidenceValue(value: unknown): string {
  if (value === null) return 'unknown'
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  if (typeof value === 'number') return String(Number(value.toFixed(2)))
  if (typeof value !== 'object') return String(value)
  const record = value as Record<string, unknown>
  if (typeof record.espn_id === 'string') {
    const name = typeof record.name === 'string' && record.name ? record.name : `ESPN player ${record.espn_id}`
    const details = typeof record.vorp_score === 'number'
      ? [record.position, `${record.vorp_score.toFixed(1)} VORP`]
      : [record.position, record.nfl_team]
    const shown = details.filter((part) => typeof part === 'string' && part)
    return shown.length ? `${name} (${shown.join(', ')})` : name
  }
  if (typeof record.week === 'number' && Array.isArray(record.reasons)) {
    return `Week ${record.week} not scored: ${record.reasons.map((code) => reasonLabel(String(code)).label).join('; ')}`
  }
  return JSON.stringify(value)
}

/** The worker's staging gates. final_score isn't one: a proposal ranked by our lineup gain has
 * none, and it is still proposable. */
export function isProposable(score: TradeScore) {
  const { our_lineup_gain: gain, counterparty_lineup_change: theirs } = score.score
  return gain != null && gain > 0 && theirs != null && theirs >= 0
    && score.horizon.scored_weeks.length > 0
    && !score.roster_impact.us.exceeds_roster_limit && !score.roster_impact.counterparty.exceeds_roster_limit
}

export type ScoreTone = 'neutral' | 'positive' | 'negative'
/** Tone of a value as displayed, so two values that both read "−0.0" or "+0.1" never differ in
 * color. Anything that rounds to within 0.05 of zero is neutral. */
export function scoreTone(value: number | null | undefined, precision = 1): ScoreTone {
  if (value == null || !Number.isFinite(value)) return 'neutral'
  const displayed = Number(value.toFixed(precision))
  return Math.abs(displayed) <= 0.05 ? 'neutral' : displayed > 0 ? 'positive' : 'negative'
}
export const toneColor: Record<ScoreTone, string> = { neutral: 'dimmed', positive: 'var(--incoming)', negative: 'var(--error)' }
