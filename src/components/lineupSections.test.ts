import { describe, expect, it } from 'vitest'
import { lineupSections } from './lineupSections'
import type { LineupPlayerLine, LineupRosterResponse } from '../api/types'

const line = (id: string, slot: string): LineupPlayerLine => ({
  player_id: id, espn_id: `espn-${id}`, name: id, position: 'RB', slot, pro_team: 'KC',
  jersey: null, injury_status: null, headshot_url: '', deficit_flag: false,
  suggested_swap: null, net_vorp: 5, rumor_sentiment: null, rumor_confidence: null, rumor_suggested_action: null,
})

const roster = (bench: LineupPlayerLine[], counts?: Record<string, number> | null): LineupRosterResponse => ({
  starters: [line('Starter', 'RB')], bench, lineup_slot_counts: counts,
})

describe('lineupSections', () => {
  it('splits IR players out of the bench by slot', () => {
    const sections = lineupSections(roster([line('Backup', 'BE'), line('Hurt', 'IR')], { BE: 7, IR: 1 }))
    expect(sections.bench.map((p) => p.player_id)).toEqual(['Backup'])
    expect(sections.ir.map((p) => p.player_id)).toEqual(['Hurt'])
  })

  it('reports capacity and open spots from the league slot counts', () => {
    const sections = lineupSections(roster([line('A', 'BE'), line('B', 'BE'), line('Hurt', 'IR')], { BE: 3, IR: 2 }))
    expect(sections.benchCapacity).toBe(3)
    expect(sections.openBench).toBe(1)
    expect(sections.irCapacity).toBe(2)
    expect(sections.openIr).toBe(1)
  })

  it('has unknown capacity and no open spots without slot counts', () => {
    for (const counts of [undefined, null]) {
      const sections = lineupSections(roster([line('A', 'BE')], counts))
      expect(sections.benchCapacity).toBeNull()
      expect(sections.irCapacity).toBeNull()
      expect(sections.openBench).toBe(0)
      expect(sections.openIr).toBe(0)
    }
  })

  it('never reports negative open spots when a section is over capacity', () => {
    const sections = lineupSections(roster([line('A', 'BE'), line('B', 'BE')], { BE: 1 }))
    expect(sections.openBench).toBe(0)
    expect(sections.irCapacity).toBe(0)
  })

  it('treats a missing IR count in synced settings as no IR slots', () => {
    const sections = lineupSections(roster([], { BE: 7 }))
    expect(sections.irCapacity).toBe(0)
    expect(sections.openIr).toBe(0)
  })
})
