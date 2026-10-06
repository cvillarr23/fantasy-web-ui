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
