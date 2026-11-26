import { describe, expect, it } from 'vitest'
import type { PlayerLine } from '../../api/types'
import { matchupFixture } from '../matchup/fixtures'
import { scoredMatchupFixture, scoringRules } from './fixtures'
import { defaultExampleId, examplePlayers, multiplyStep, type ExamplePlayer } from './workedExample'

const rules = scoringRules.rules
const ids = (players: ExamplePlayer[]) => players.map((p) => p.id)

function runner(lines: ExamplePlayer['lines'], position = 'RB'): ExamplePlayer {
  return { id: 'x', name: 'Sample', position, points: 0, lines }
}

describe('examplePlayers', () => {
  it('lists only players with a breakdown, split by side', () => {
    const players = examplePlayers(scoredMatchupFixture())
    expect(ids(players.mine)).toEqual(['a1', 'a2'])
    expect(ids(players.theirs)).toEqual(['c1'])
  })

  it('includes bench players', () => {
    const matchup = scoredMatchupFixture()
    const benched: PlayerLine = { ...matchup.our_team.starters[1], player_id: 'b1', slot: 'BE' }
    matchup.our_team.bench = [benched]
    expect(ids(examplePlayers(matchup).mine)).toContain('b1')
  })

  it('is empty before anyone has scored', () => {
    expect(examplePlayers(matchupFixture())).toEqual({ mine: [], theirs: [] })
  })
})

describe('defaultExampleId', () => {
  it('picks your highest scorer, even when an opponent scored more', () => {
    const players = examplePlayers(scoredMatchupFixture())
    players.theirs[0].points = 99
    expect(defaultExampleId(players)).toBe('a2')
  })

  it("falls back to the opponent's highest scorer when none of yours has scored", () => {
    const players = examplePlayers(scoredMatchupFixture())
    expect(defaultExampleId({ mine: [], theirs: players.theirs })).toBe('c1')
  })

  it('is null with nobody to show', () => {
    expect(defaultExampleId({ mine: [], theirs: [] })).toBeNull()
  })
})

describe('multiplyStep', () => {
  const rush = { stat_key: 'rushYd', label: 'Rushing yards', qty: 78, unit: 'yds', rule_label: null, points: 7.8 }

  it("multiplies the player's biggest stat by the league rule", () => {
    const touchdown = { stat_key: 'rushTD', label: 'Rushing TD', qty: 1, unit: 'TD', rule_label: null, points: 6 }
    expect(multiplyStep(runner([touchdown, rush]), rules)).toBe('Rushing yards: 78 yds × 0.1 = 7.8')
  })

  it('keeps small rules and negative points readable', () => {
    const pass = { stat_key: 'passYd', label: 'Passing yards', qty: 281, unit: 'yds', rule_label: null, points: 11.24 }
    const fumble = { stat_key: 'fumLost', label: 'Fumble lost', qty: 1, unit: 'lost', rule_label: null, points: -2 }
    expect(multiplyStep(runner([pass]), rules)).toBe('Passing yards: 281 yds × 0.04 = 11.24')
    expect(multiplyStep(runner([fumble]), rules)).toBe('Fumble lost: 1 lost × −2 = −2')
  })

  it("uses the rule for the player's position over the general one", () => {
    const override = { ...rules.find((r) => r.stat_key === 'rushYd')!, points_per: 0.2, position: 'QB' }
    const line = { ...rush, points: 15.6 }
    expect(multiplyStep(runner([line], 'QB'), [...rules, override])).toBe('Rushing yards: 78 yds × 0.2 = 15.6')
  })

  it('shows no sum that would be wrong or has nothing to multiply', () => {
    const mismatched = { ...rush, points: 9 }
    const range = { stat_key: 'ptsAllowed0', label: '0 points allowed', qty: 1, unit: null, rule_label: null, points: 5 }
    const other = { stat_key: 'other', label: 'Other scoring', qty: null, unit: null, rule_label: 'Not itemized', points: 3 }
    expect(multiplyStep(runner([mismatched, range, other], 'D/ST'), rules)).toBeNull()
  })
})
