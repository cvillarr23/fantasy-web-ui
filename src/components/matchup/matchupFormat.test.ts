import { describe, expect, it } from 'vitest'
import { isZeroProjection, knownScore, projectedMargin, slotLabel, winChance } from './matchupFormat'

describe('knownScore', () => {
  it('treats null, undefined, NaN and 0.0 as unknown', () => {
    expect(knownScore(null)).toBeNull()
    expect(knownScore(undefined)).toBeNull()
    expect(knownScore(Number.NaN)).toBeNull()
    expect(knownScore(0)).toBeNull()
  })
  it('keeps real scores, including negatives', () => {
    expect(knownScore(12.4)).toBe(12.4)
    expect(knownScore(-1)).toBe(-1)
  })
})

describe('projectedMargin', () => {
  it('subtracts the opponent projection from ours', () => {
    expect(projectedMargin(118.2, 109.6)).toBeCloseTo(8.6)
    expect(projectedMargin(100, 120)).toBe(-20)
  })
  it('is unknown when either projection is missing', () => {
    expect(projectedMargin(null, 100)).toBeNull()
    expect(projectedMargin(100, undefined)).toBeNull()
  })
})

describe('winChance', () => {
  it('is 50% for an even matchup', () => {
    expect(winChance(0)).toBe(50)
  })
  it('favors the projected leader and mirrors for the trailer', () => {
    expect(winChance(8.6)).toBe(63)
    expect(winChance(-8.6)).toBe(37)
  })
  it('never reaches 0% or 100%', () => {
    expect(winChance(500)).toBe(99)
    expect(winChance(-500)).toBe(1)
  })
  it('is unknown without a margin', () => {
    expect(winChance(null)).toBeNull()
    expect(winChance(Number.NaN)).toBeNull()
  })
})

describe('slotLabel', () => {
  it('shows a matching slot and position once', () => {
    expect(slotLabel('RB', 'RB')).toBe('RB')
    expect(slotLabel('D/ST', 'D/ST')).toBe('D/ST')
  })
  it('shows both when they differ', () => {
    expect(slotLabel('FLEX', 'WR')).toBe('FLEX · WR')
    expect(slotLabel('BE', 'QB')).toBe('BE · QB')
  })
})

describe('isZeroProjection', () => {
  it('flags only an exact zero projection', () => {
    expect(isZeroProjection(0)).toBe(true)
    expect(isZeroProjection(0.1)).toBe(false)
    expect(isZeroProjection(null)).toBe(false)
  })
})
