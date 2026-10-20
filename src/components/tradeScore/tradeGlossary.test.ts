import { expect, it } from 'vitest'
import { tradeGlossaryForWeights } from './tradeGlossary'

it.each([
  undefined,
  null,
  {},
  { strength_weight: 0.25, z_clamp: 2 },
  { strength_weight: Number.NaN, z_clamp: 2, indirect_factor: 0.25 },
  { strength_weight: 0.25, z_clamp: Number.POSITIVE_INFINITY, indirect_factor: 0.25 },
  { strength_weight: 0.25, z_clamp: 2, indirect_factor: '0.25' },
  { strength_weight: 0.25, z_clamp: 2, indirect_factor: Number.NEGATIVE_INFINITY },
])('omits all formulas when weights are incomplete or nonfinite: %j', (weights) => {
  const glossary = tradeGlossaryForWeights(weights)
  for (const entry of [glossary.finalScore, glossary.costOfHelpingThem, glossary.scheduleBoost, glossary.opponentMultiplier, glossary.headToHead]) {
    expect(entry.length).toBeGreaterThan(20)
    expect(entry).not.toMatch(/undefined|NaN|Infinity|clamp|×|0\.25|quarter/)
  }
})
