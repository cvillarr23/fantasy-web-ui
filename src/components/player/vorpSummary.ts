import type { TradeContextPlayer } from '../../api/tradeContextTypes'

type Reason = 'bye' | 'out' | 'none'

/** A trade-context player's VORP for the viewed week, the rest of the horizon, and, when the
 * week has none, why: core writes no projection for a player's NFL bye week or for a player
 * ruled out, so a blank week is expected there rather than missing data. */
export type VorpSummary =
  | { kind: 'week'; vorp: number }
  | { kind: 'later'; reason: Reason; status: string | null; vorp: number; weeks: number }
  | { kind: 'missing'; reason: Reason; status: string | null }

const OUT_STATUSES: Record<string, string> = { OUT: 'Out', INJURY_RESERVE: 'IR', IR: 'IR', SUSPENSION: 'Suspended' }

export function vorpSummary(player: Pick<TradeContextPlayer, 'metrics' | 'nfl_bye_week' | 'injury_status'>, week: number): VorpSummary {
  const vorp = player.metrics[String(week)]?.vorp_score
  if (vorp != null) return { kind: 'week', vorp }
  const reason = _missingReason(player, week)
  const status = _outLabel(player.injury_status)
  const later = _laterVorp(player.metrics, week)
  return later.weeks ? { kind: 'later', reason, status, ...later } : { kind: 'missing', reason, status }
}

/** Short card label, e.g. "6.4 VORP", "On bye · -8.0 VORP next 3 wks", "IR · no projection". */
export function vorpLabel(summary: VorpSummary): string {
  if (summary.kind === 'week') return `${summary.vorp.toFixed(1)} VORP`
  if (summary.kind === 'missing' && summary.reason === 'none') return 'No projection'
  const reason = _reasonLabel(summary.reason, summary.status)
  if (summary.kind === 'missing') return `${reason} · no projection`
  return `${reason} · ${summary.vorp.toFixed(1)} VORP next ${summary.weeks} wk${summary.weeks === 1 ? '' : 's'}`
}

/** Table-cell label for the viewed week only: the number, or the reason it has none. */
export function vorpCell(summary: VorpSummary): string {
  if (summary.kind === 'week') return summary.vorp.toFixed(1)
  if (summary.reason === 'bye') return 'Bye'
  return summary.reason === 'out' ? summary.status! : 'Unknown'
}

function _missingReason(player: Pick<TradeContextPlayer, 'nfl_bye_week' | 'injury_status'>, week: number): Reason {
  if (player.nfl_bye_week === week) return 'bye'
  return _outLabel(player.injury_status) ? 'out' : 'none'
}

function _outLabel(status: string | null): string | null {
  return status ? OUT_STATUSES[status] ?? null : null
}

/** Sum of VORP over the weeks after the viewed one. Trade context only carries the scoring
 * horizon's weeks, so every later key is inside the horizon. */
function _laterVorp(metrics: TradeContextPlayer['metrics'], week: number) {
  const values = Object.entries(metrics)
    .filter(([key, metric]) => Number(key) > week && metric.vorp_score != null)
    .map(([, metric]) => metric.vorp_score!)
  return { vorp: values.reduce((total, value) => total + value, 0), weeks: values.length }
}

function _reasonLabel(reason: Reason, status: string | null): string {
  if (reason === 'bye') return 'On bye'
  return reason === 'out' ? status! : 'No projection this week'
}
