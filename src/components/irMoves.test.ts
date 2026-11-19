import { describe, expect, it } from 'vitest'
import { irMoveIdempotencyKey, irMoveInstruction, irSwapCandidates, irSwapIdempotencyKey, irSwapInstructions } from './irMoves'
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

describe('irSwapCandidates', () => {
  it('offers bench players ESPN lists OUT or INJURY_RESERVE, with an ESPN id', () => {
    const bench = [
      line({ player_id: 'out', slot: 'BE', injury_status: 'OUT' }),
      line({ player_id: 'ir', slot: 'BE', injury_status: 'INJURY_RESERVE' }),
      line({ player_id: 'q', slot: 'BE', injury_status: 'QUESTIONABLE' }),
      line({ player_id: 'healthy', slot: 'BE', injury_status: null }),
      line({ player_id: 'no-id', slot: 'BE', injury_status: 'OUT', espn_id: '' }),
    ]
    expect(irSwapCandidates(bench).map((l) => l.player_id)).toEqual(['out', 'ir'])
  })
})

describe('irSwapInstructions', () => {
  it('activates one player and moves the other into IR in one request', () => {
    const healed = line({ espn_id: '1', name: 'Healed', slot: 'IR', ir_suggestion: { action: 'activate_from_ir', reason: '' } })
    const hurt = line({ espn_id: '2', name: 'Hurt', slot: 'BE', ir_suggestion: null })
    expect(irSwapInstructions(healed, hurt)).toEqual([
      { kind: 'activate_ir', player_id: '1', player_name: 'Healed', slot: 'BENCH' },
      { kind: 'ir', player_id: '2', player_name: 'Hurt', slot: 'IR' },
    ])
  })

  it('keys a swap apart from a lone activation and from other partners', () => {
    const lone = irMoveIdempotencyKey(config, 5, '1', 'activate_ir')
    expect(irSwapIdempotencyKey(config, 5, '1', '2')).toBe('lineup-ir:123:8:2026:5:1:activate_ir:swap:2')
    expect(irSwapIdempotencyKey(config, 5, '1', '2')).not.toBe(lone)
    expect(irSwapIdempotencyKey(config, 5, '1', '3')).not.toBe(irSwapIdempotencyKey(config, 5, '1', '2'))
  })
})
