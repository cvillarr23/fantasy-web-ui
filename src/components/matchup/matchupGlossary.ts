import { MARGIN_SPREAD } from './matchupFormat'

/** Explanations for the Matchup page. InfoTip copy lives here, not inline. */
export const matchupGlossary = {
  actual: 'Fantasy points scored so far this week. A dash means nothing has been scored yet.',
  projected: "ESPN's estimate of the fantasy points a player or team will score over the whole week.",
  margin: "Our projected total minus the opponent's. Positive means we are projected to win.",
  winChance: `Our own estimate, not ESPN's. It treats the projected margin as the most likely result with a typical swing of about ${MARGIN_SPREAD} points either way, so use it as a rough guide.`,
  zeroProjection: 'ESPN projects 0.0 points for this player, which usually means they are out, inactive or on a bye. Check your lineup.',
} as const
