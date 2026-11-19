import type { DraftConfig, LineupIrMove, LineupPlayerLine } from '../api/types'

/** The single trigger entry that carries out a line's IR suggestion, or null when there is
 * nothing this UI can send: no suggestion, or no ESPN id for the worker to act on. */
export function irMoveInstruction(line: LineupPlayerLine): LineupIrMove | null {
  if (!line.espn_id || !line.ir_suggestion) return null
  return line.ir_suggestion.action === 'move_to_ir'
    ? { kind: 'ir', player_id: line.espn_id, player_name: line.name, slot: 'IR' }
    : { kind: 'activate_ir', player_id: line.espn_id, player_name: line.name, slot: 'BENCH' }
}

/** Derived from the move itself rather than generated per click, so a double-click, a retry
 * after an unanswered request, or a reload all present the same key. The gateway then answers
 * "duplicate" instead of queueing a second live ESPN write. */
export function irMoveIdempotencyKey(
  config: DraftConfig,
  week: number | string,
  espnId: string,
  kind: LineupIrMove['kind'],
): string {
  return `lineup-ir:${config.league_id}:${config.team_id}:${config.season}:${Number(week)}:${espnId}:${kind}`
}

// ESPN's IR-eligible statuses, matching core's ir_eligibility and the worker's planIrMove.
const IR_ELIGIBLE_STATUSES = new Set(['OUT', 'INJURY_RESERVE'])

/** Bench players who can take an IR spot freed by an activation. Starters are left out: one
 * moving to IR frees a starting slot, not the bench spot the returning player needs. */
export function irSwapCandidates(bench: LineupPlayerLine[]): LineupPlayerLine[] {
  return bench.filter((line) => Boolean(line.espn_id) && IR_ELIGIBLE_STATUSES.has(line.injury_status ?? ''))
}

/** Activation plus the injured player who takes the IR spot, sent as one ESPN transaction.
 * With a full bench neither move fits alone: the returning player has nowhere to land and the
 * injured one has no open IR slot until the activation frees it. */
export function irSwapInstructions(activating: LineupPlayerLine, toIr: LineupPlayerLine): LineupIrMove[] {
  return [
    { kind: 'activate_ir', player_id: activating.espn_id, player_name: activating.name, slot: 'BENCH' },
    { kind: 'ir', player_id: toIr.espn_id, player_name: toIr.name, slot: 'IR' },
  ]
}

export function irSwapIdempotencyKey(
  config: DraftConfig,
  week: number | string,
  activatingEspnId: string,
  toIrEspnId: string,
): string {
  return `${irMoveIdempotencyKey(config, week, activatingEspnId, 'activate_ir')}:swap:${toIrEspnId}`
}
