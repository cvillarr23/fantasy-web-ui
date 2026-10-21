import type { TradeScore } from '../../api/types'

/** Explanations that do not assume any scorer weights. */
export const tradeGlossary = {
  counterparty: 'The opponent who would receive this offer.',
  candidateDetails: 'Inspect both starting lineups and re-score the trade live before acting.',

  strength: "Strength compares a team's fantasy points per week so far to the league average, in standard deviations. +1.0 means about one standard deviation above average; 0 is average. It is not a win probability, and it is not NFL defense strength.",
  ourLineupGain: 'How many VORP points our best possible starting lineup gains over the scored weeks after this trade. Bench players count only if they would start.',
  theirChange: "Change in their best starting lineup. Zero or positive means they don't lose anything, so the trade is realistic to propose.",
  statuses: "Proposable: we gain and they don't lose. Needs a drop: same, but someone ends up over the roster limit. One-sided: one team loses lineup value, so it's unlikely to be accepted.",
  byeCrunch: 'A week where NFL byes leave you unable to fill a starting slot, or force a replacement-level starter. Trades that bring in a player without that bye help.',
  ourWeightedGain: "G* sums each scored week's lineup gain multiplied by our fantasy opponent's strength multiplier. Schedule adjustment is G* minus G.",
  vorp: 'Value over a replacement-level player at the same position. Raw player VORP totals cover one week and ignore starting lineups and schedules.',
  horizon: 'The requested number of scoring weeks, starting at the selected week and capped at the end of the regular season.',
  scoredWeeks: 'Totals cover only scored weeks. A complete horizon means no horizon weeks were unscored; it does not guarantee complete roster data or known strength. Partial totals are not an estimate for the full horizon.',
} as const

/** Persisted evaluations may have incomplete weights; never invent a formula for them. */
export function tradeGlossaryForWeights(weights: unknown) {
  const fallback = {
    ...tradeGlossary,
    finalScore: 'One number to rank trades: our schedule-weighted lineup gain, minus a penalty for how much the trade also helps them. Higher is better for us.',
    scheduleBoost: 'Extra credit for gains in weeks we face strong opponents (and less in weeks we face weak ones).',
    costOfHelpingThem: 'Their lineup gain turned into a penalty on our score. The size of the penalty depends on the fantasy schedule.',
    opponentMultiplier: 'Adjusts a lineup gain for fantasy opponent strength. Fantasy byes weigh nothing. Unknown pairing or strength means the weight is unavailable.',
    headToHead: 'When we face the other team, their lineup change counts against us more heavily than in other weeks.',
  }
  if (weights == null || typeof weights !== 'object') return fallback
  const { strength_weight, z_clamp, indirect_factor } = weights as Partial<TradeScore['weights']>
  if (typeof strength_weight !== 'number' || !Number.isFinite(strength_weight)
    || typeof z_clamp !== 'number' || !Number.isFinite(z_clamp)
    || typeof indirect_factor !== 'number' || !Number.isFinite(indirect_factor)) return fallback

  const multiplier = `1 + ${strength_weight} × clamp(z, −${z_clamp}, ${z_clamp})`
  const minimum = Number((1 - strength_weight * z_clamp).toFixed(6))
  const maximum = Number((1 + strength_weight * z_clamp).toFixed(6))
  const indirect = indirect_factor === 0.25 ? 'a quarter as much' : `${indirect_factor} times as much`
  return {
    ...fallback,
    finalScore: `One number to rank trades: our schedule-weighted lineup gain, minus a penalty for how much the trade also helps them. The penalty counts fully in weeks we play them head-to-head and ${indirect} otherwise. Higher is better for us.`,
    scheduleBoost: `Extra credit for gains in weeks we face strong opponents (and less in weeks we face weak ones). Multiplier = ${multiplier}, ranging ${minimum}–${maximum}.`,
    costOfHelpingThem: `Their lineup gain turned into a penalty on our score. It's weighted heavily in weeks we face them and lightly (×${indirect_factor}) otherwise. Usually a small negative number.`,
    opponentMultiplier: `Opponent multiplier = ${multiplier}, ranging from ${minimum} to ${maximum}. Fantasy byes weigh 0. Unknown pairing or strength means the weight is unavailable.`,
    headToHead: `When we face the other team, their lineup change counts against us at our full opponent multiplier. Otherwise it counts at ${indirect_factor} times their opponent multiplier.`,
  }
}

export type TradeGlossary = ReturnType<typeof tradeGlossaryForWeights>
