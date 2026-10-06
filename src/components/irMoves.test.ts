import { describe, expect, it } from 'vitest'
import { irMoveIdempotencyKey, irMoveInstruction } from './irMoves'
import type { DraftConfig, LineupPlayerLine } from '../api/types'

const config = { league_id: '123', team_id: '8', season: 2026, mode: 'live' } as DraftConfig
const line = (overrides: Partial<LineupPlayerLine> = {}): LineupPlayerLine => ({
  player_id: 'sleeper-1', espn_id: '4046', name: 'Hurt Back', position: 'RB', slot: 'RB', pro_team: 'KC',
  jersey: null, injury_status: 'OUT', headshot_url: '', deficit_flag: false, suggested_swap: null,
  net_vorp: 3, rumor_sentiment: null, rumor_confidence: null, rumor_suggested_action: null,
  ir_suggestion: { action: 'move_to_ir', reason: 'Out for the season.' },
  ...overrides,
})

describe('irMoveInstruction', () => {
  it('sends a move to IR by ESPN id into the IR slot', () => {
    expect(irMoveInstruction(line())).toEqual({ kind: 'ir', player_id: '4046', player_name: 'Hurt Back', slot: 'IR' })
  })

  it('activates from IR onto the bench', () => {
    expect(irMoveInstruction(line({ slot: 'IR', ir_suggestion: { action: 'activate_from_ir', reason: 'Healthy.' } })))
      .toEqual({ kind: 'activate_ir', player_id: '4046', player_name: 'Hurt Back', slot: 'BENCH' })
  })

  it('has nothing to send without an ESPN id or a suggestion', () => {
    expect(irMoveInstruction(line({ espn_id: '' }))).toBeNull()
    expect(irMoveInstruction(line({ ir_suggestion: null }))).toBeNull()
    expect(irMoveInstruction(line({ ir_suggestion: undefined }))).toBeNull()
  })
})

describe('irMoveIdempotencyKey', () => {
  it('is stable for the same player, action and week', () => {
    expect(irMoveIdempotencyKey(config, 5, '4046', 'ir')).toBe('lineup-ir:123:8:2026:5:4046:ir')
    expect(irMoveIdempotencyKey(config, '5', '4046', 'ir')).toBe(irMoveIdempotencyKey(config, 5, '4046', 'ir'))
  })

  it('differs by action, player and week', () => {
    const base = irMoveIdempotencyKey(config, 5, '4046', 'ir')
    expect(irMoveIdempotencyKey(config, 5, '4046', 'activate_ir')).not.toBe(base)
    expect(irMoveIdempotencyKey(config, 5, '9999', 'ir')).not.toBe(base)
    expect(irMoveIdempotencyKey(config, 6, '4046', 'ir')).not.toBe(base)
  })
})
