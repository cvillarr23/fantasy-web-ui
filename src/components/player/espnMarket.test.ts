import { describe, expect, it } from 'vitest'
import type { EspnOwnership } from '../../api/types'
import { espnTooltip, formatChange, formatPosRank, hasEspnData, isCold, nextEspnSort, sortByEspn, tradeHeadsUp } from './espnMarket'

const espn = (over: Partial<EspnOwnership> = {}): EspnOwnership => ({
  pos_rank: 12,
  percent_owned: 92,
  percent_started: 78,
  percent_bench: 14,
  percent_change: 3,
  ...over,
})

describe('hasEspnData', () => {
  it('is false for missing or all-null data', () => {
    expect(hasEspnData(undefined)).toBe(false)
    expect(hasEspnData(null)).toBe(false)
    expect(
      hasEspnData({ pos_rank: null, percent_owned: null, percent_started: null, percent_bench: null, percent_change: null }),
    ).toBe(false)
  })
  it('is true when any field is set', () => {
    expect(hasEspnData(espn({ pos_rank: null, percent_owned: null, percent_bench: null, percent_change: null }))).toBe(true)
  })
})

describe('isCold', () => {
  it.each([
    [24, true],
    [25, false],
    [0, true],
    [null, false],
  ])('start %s -> %s', (started, cold) => {
    expect(isCold(espn({ percent_started: started }))).toBe(cold)
  })
  it('is false without data', () => expect(isCold(null)).toBe(false))
})

describe('formatPosRank', () => {
  it('joins position and rank', () => expect(formatPosRank('WR', 12)).toBe('WR12'))
  it('is null without a rank', () => expect(formatPosRank('WR', null)).toBeNull())
  it('falls back to the bare rank without a position', () => expect(formatPosRank(null, 7)).toBe('#7'))
})

describe('formatChange', () => {
  it('marks gains up', () => expect(formatChange(3)).toEqual({ text: '▲3', tone: 'up' }))
  it('marks losses down with the magnitude', () => expect(formatChange(-4)).toEqual({ text: '▼4', tone: 'down' }))
  it('rounds fractional change', () => expect(formatChange(2.6)).toEqual({ text: '▲3', tone: 'up' }))
  it.each([[0], [null], [0.2]])('is null for no movement (%s)', (v) => expect(formatChange(v)).toBeNull())
})

describe('espnTooltip', () => {
  it('spells out the league-wide numbers', () => {
    expect(espnTooltip(espn())).toBe('ESPN, all leagues: 92% rostered, 78% started, 14% benched')
  })
  it('uses a dash for unknown values', () => {
    expect(espnTooltip(espn({ percent_owned: null }))).toBe('ESPN, all leagues: — rostered, 78% started, 14% benched')
  })
})

describe('tradeHeadsUp', () => {
  const p = (started: number | null) => ({ espn: espn({ percent_started: started }) })

  it('fires when give leads by 25+ on average and get has a cold player', () => {
    const result = tradeHeadsUp([p(78), p(71)], [p(60), p(22)])
    expect(result).not.toBeNull()
    expect(result?.message).toBe(
      "You'd send two players ESPN managers start (78%, 71%) for one starter and one player who is mostly benched (22% start).",
    )
  })
  it('fires at exactly a 25 point gap', () => {
    expect(tradeHeadsUp([p(49)], [p(24)])).not.toBeNull()
  })
  it('does not fire just under a 25 point gap', () => {
    expect(tradeHeadsUp([p(48)], [p(24)])).toBeNull()
  })
  it('does not fire when the get side has no cold player', () => {
    expect(tradeHeadsUp([p(90)], [p(25), p(30)])).toBeNull()
  })
  it('does not fire when the gap is big but the give side starts less', () => {
    expect(tradeHeadsUp([p(10)], [p(60), p(20)])).toBeNull()
  })
  it('ignores players without start data', () => {
    expect(tradeHeadsUp([p(78), p(null)], [p(20)])).not.toBeNull()
    expect(tradeHeadsUp([p(null)], [p(20)])).toBeNull()
    expect(tradeHeadsUp([{ espn: null }], [p(20)])).toBeNull()
    expect(tradeHeadsUp([], [p(20)])).toBeNull()
    expect(tradeHeadsUp([p(80)], [])).toBeNull()
  })
  it('words a single give player and an all-cold get side', () => {
    expect(tradeHeadsUp([p(80)], [p(10), p(20)])?.message).toBe(
      "You'd send one player ESPN managers start (80%) for two players who are mostly benched (10%, 20% start).",
    )
  })
})

describe('nextEspnSort', () => {
  it('starts each column in its natural direction, then reverses, then clears', () => {
    const first = nextEspnSort(null, 'rank')
    expect(first).toEqual({ key: 'rank', direction: 'asc' })
    const second = nextEspnSort(first, 'rank')
    expect(second).toEqual({ key: 'rank', direction: 'desc' })
    expect(nextEspnSort(second, 'rank')).toBeNull()
    expect(nextEspnSort(second, 'start')).toEqual({ key: 'start', direction: 'desc' })
  })
})

describe('sortByEspn', () => {
  const rows = [
    { id: 'a', espn: espn({ pos_rank: 9, percent_started: 40 }) },
    { id: 'b', espn: null },
    { id: 'c', espn: espn({ pos_rank: 2, percent_started: 90 }) },
    { id: 'd', espn: espn({ pos_rank: null, percent_started: null }) },
  ]
  const ids = (sorted: typeof rows) => sorted.map((r) => r.id)
  const get = (r: (typeof rows)[number]) => r.espn

  it('puts the best rank first and rows without a value last', () => {
    expect(ids(sortByEspn(rows, get, { key: 'rank', direction: 'asc' }))).toEqual(['c', 'a', 'b', 'd'])
  })
  it('keeps missing values last when the direction flips', () => {
    expect(ids(sortByEspn(rows, get, { key: 'start', direction: 'desc' }))).toEqual(['c', 'a', 'b', 'd'])
    expect(ids(sortByEspn(rows, get, { key: 'start', direction: 'asc' }))).toEqual(['a', 'c', 'b', 'd'])
  })
  it('returns the input untouched with no sort', () => {
    expect(sortByEspn(rows, get, null)).toBe(rows)
  })
})
