/** Shared explanations for trade cards, filters, context and score evidence. */
export const tradeGlossary = {
  strength: "Strength compares a team's fantasy points per week so far to the league average, in standard deviations. +1.0 means about one standard deviation above average; 0 is average. It is not a win probability, and it is not NFL defense strength.",
  finalScore: 'One number to rank trades: our schedule-weighted lineup gain plus a small credit when the other team also improves (more if we play them). Higher is better for us.',
  ourLineupGain: 'How many VORP points our best possible starting lineup gains over the scored weeks after this trade. Bench players count only if they would start.',
  scheduleBoost: 'Extra credit for gains in weeks we face strong opponents (and less in weeks we face weak ones). Multiplier = 1 + 0.25 × opponent strength, clamped to 0.5–1.5.',
  theirBenefit: "How much the other team's starting lineup improves, weighted by their schedule. Positive means they also win, which makes them more likely to accept. If we face them head-to-head, their gain counts against us.",
  theirChange: "Change in the other team's best starting lineup. Zero or positive means they don't lose anything, so the trade is realistic to propose.",
  statuses: "Proposable: we gain and they don't lose. Needs a drop: same, but someone ends up over the roster limit. One-sided: one team loses lineup value, so it's unlikely to be accepted.",
  byeCrunch: 'A week where NFL byes leave you unable to fill a starting slot, or force a replacement-level starter. Trades that bring in a player without that bye help.',
  opponentMultiplier: 'Opponent multiplier = 1 + 0.25 × clamp(z, −2, 2), ranging from 0.5 to 1.5. Fantasy byes weigh 0. Unknown pairing or strength means the weight is unavailable.',
  ourWeightedGain: "G* sums each scored week's lineup gain multiplied by our fantasy opponent's strength multiplier. Schedule adjustment is G* minus G.",
  counterpartyWeightedBenefit: 'C* sums the negative of their weekly lineup change times the counterparty weight. Their gains reduce our score; their losses increase it. Final score = G* + C*.',
  vorp: 'Value over a replacement-level player at the same position. Raw player VORP totals cover one week and ignore starting lineups and schedules.',
  horizon: 'The requested number of scoring weeks, starting at the selected week and capped at the end of the regular season.',
  scoredWeeks: 'Totals cover only scored weeks. A complete horizon means no horizon weeks were unscored; it does not guarantee complete roster data or known strength. Partial totals are not an estimate for the full horizon.',
  headToHead: 'When we face the other team, their lineup change counts against us at our full opponent multiplier. Otherwise it counts at 0.25 times their opponent multiplier.',
} as const
