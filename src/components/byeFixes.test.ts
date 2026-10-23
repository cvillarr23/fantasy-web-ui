import { expect, it } from 'vitest'
import { byeFillIns, byeTradeFixes } from './byeFixes'
import { byeFixTrade, fillIn, lineupTradeCandidates, lineupWaivers } from './lineupFixtures'

it('keeps only fill-ins for a crunch week, biggest lineup gain first, at most two', () => {
  const picks = byeFillIns([...lineupWaivers.recommendations, fillIn('Third Best', 1)], [9])
  expect(picks.map((rec) => rec.free_agent.name)).toEqual(['Sample Waiver Back', 'Sample Free Agent'])
})

it('returns no fill-ins when nothing is flagged for the crunch weeks', () => {
  expect(byeFillIns(lineupWaivers.recommendations, [14])).toEqual([])
})

it('keeps only trades that fix a crunch week, in the order received', () => {
  expect(byeTradeFixes(lineupTradeCandidates, [9]).map((trade) => trade.candidate_key)).toEqual(['t1', 't3'])
  expect(byeTradeFixes([byeFixTrade('x', 'Other', [12])], [9])).toEqual([])
})
