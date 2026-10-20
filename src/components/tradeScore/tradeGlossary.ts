import type { TradeScore } from '../../api/types'

/** Shared explanations use the scorer's weights whenever score evidence is available. */
export function tradeGlossaryForWeights({ strength_weight, z_clamp, indirect_factor }: TradeScore['weights']) {
  const multiplier = `1 + ${strength_weight} × clamp(z, −${z_clamp}, ${z_clamp})`
  const minimum = Number((1 - strength_weight * z_clamp).toFixed(6))
  const maximum = Number((1 + strength_weight * z_clamp).toFixed(6))
  const indirect = indirect_factor === 0.25 ? 'a quarter as much' : `${indirect_factor} times as much`
  return {
    strength: "Strength compares a team's fantasy points per week so far to the league average, in standard deviations. +1.0 means about one standard deviation above average; 0 is average. It is not a win probability, and it is not NFL defense strength.",
    finalScore: `One number to rank trades: our schedule-weighted lineup gain, minus a penalty for how much the trade also helps them. The penalty counts fully in weeks we play them head-to-head and ${indirect} otherwise. Higher is better for us.`,
    ourLineupGain: 'How many VORP points our best possible starting lineup gains over the scored weeks after this trade. Bench players count only if they would start.',
    scheduleBoost: `Extra credit for gains in weeks we face strong opponents (and less in weeks we face weak ones). Multiplier = ${multiplier}, ranging ${minimum}–${maximum}.`,
    costOfHelpingThem: `Their lineup gain turned into a penalty on our score. It's weighted heavily in weeks we face them and lightly (×${indirect_factor}) otherwise. Usually a small negative number.`,
    theirChange: "Change in their best starting lineup. Zero or positive means they don't lose anything, so the trade is realistic to propose.",
    statuses: "Proposable: we gain and they don't lose. Needs a drop: same, but someone ends up over the roster limit. One-sided: one team loses lineup value, so it's unlikely to be accepted.",
    byeCrunch: 'A week where NFL byes leave you unable to fill a starting slot, or force a replacement-level starter. Trades that bring in a player without that bye help.',
    opponentMultiplier: `Opponent multiplier = ${multiplier}, ranging from ${minimum} to ${maximum}. Fantasy byes weigh 0. Unknown pairing or strength means the weight is unavailable.`,
    ourWeightedGain: "G* sums each scored week's lineup gain multiplied by our fantasy opponent's strength multiplier. Schedule adjustment is G* minus G.",
    vorp: 'Value over a replacement-level player at the same position. Raw player VORP totals cover one week and ignore starting lineups and schedules.',
    horizon: 'The requested number of scoring weeks, starting at the selected week and capped at the end of the regular season.',
    scoredWeeks: 'Totals cover only scored weeks. A complete horizon means no horizon weeks were unscored; it does not guarantee complete roster data or known strength. Partial totals are not an estimate for the full horizon.',
    headToHead: `When we face the other team, their lineup change counts against us at our full opponent multiplier. Otherwise it counts at ${indirect_factor} times their opponent multiplier.`,
  } as const
}

/** Defaults for explanations outside a scored proposal. */
export const tradeGlossary = tradeGlossaryForWeights({ strength_weight: 0.25, z_clamp: 2, indirect_factor: 0.25 })
