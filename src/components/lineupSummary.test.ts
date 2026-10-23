import { expect, it } from 'vitest'
import { injuredStarterCount, positionShortfalls } from './lineupSummary'
import type { LineupPlayerLine, LineupRosterResponse, RosterDeficitsResponse } from '../api/types'

const line = (id: string, injury: string | null): LineupPlayerLine => ({
  player_id: id, espn_id: id, name: id, position: 'RB', slot: 'RB', pro_team: 'KC', jersey: null,
  injury_status: injury, headshot_url: '', deficit_flag: false, suggested_swap: null, net_vorp: 1,
  rumor_sentiment: null, rumor_confidence: null, rumor_suggested_action: null,
})

it('counts only starters with a real injury status', () => {
  const roster: LineupRosterResponse = {
    starters: [line('a', 'QUESTIONABLE'), line('b', 'ACTIVE'), line('c', null), line('d', 'NORMAL'), line('e', 'OUT')],
    bench: [line('f', 'OUT')],
  }
  expect(injuredStarterCount(roster)).toBe(2)
})

const cell = (rostered: number, required: number) => ({
  rostered, starters_required: required, deficit: Math.max(0, required - rostered), net_vorp: 0,
})
const deficits: RosterDeficitsResponse = {
  season: 2026, week: 5, roster_snapshot: 'current',
  teams: { '7': { QB: cell(2, 1), RB: cell(4, 2), WR: cell(1, 2), TE: cell(0, 2) }, '8': { QB: cell(0, 1) } },
}

it('lists short positions in display order with how many are missing', () => {
  expect(positionShortfalls(deficits, '7')).toEqual([{ position: 'WR', short: 1 }, { position: 'TE', short: 2 }])
})

it('treats an unknown team as having no shortfalls', () => {
  expect(positionShortfalls(deficits, '99')).toEqual([])
})
