export interface ReasonText {
  label: string
  detail: string
}

// Plain-language text for the codes core's trade scorer emits: per unscored week, for a
// withheld final score, and for players left out of a week's lineup.
const REASONS: Record<string, ReasonText> = {
  unmapped_traded_player: {
    label: 'Traded player not mapped',
    detail: 'A traded player has no internal player mapping, so their value is unknown.',
  },
  unknown_traded_player_position: {
    label: 'Traded player position unknown',
    detail: 'A traded player has no position, so they cannot be placed in a lineup.',
  },
  schedule_unavailable: {
    label: 'NFL schedule unavailable',
    detail: 'The NFL schedule for this week is missing, so byes cannot be told apart from missing metrics.',
  },
  missing_traded_player_metrics: {
    label: 'Traded player metrics missing',
    detail: 'A traded player has no VORP for this week.',
  },
  no_week_metrics: {
    label: 'No metrics for this week',
    detail: 'No player has VORP for this week yet.',
  },
  unsupported_lineup_slot: {
    label: 'Unsupported lineup slot',
    detail: 'The league uses a starting slot the scorer cannot fill.',
  },
  lineup_unfillable: {
    label: 'Lineup could not be filled',
    detail: 'No valid starting lineup could be built for one of the teams.',
  },
  no_scored_weeks: {
    label: 'No scored weeks',
    detail: 'No week in the horizon could be scored.',
  },
  unknown_our_opponent_strength: {
    label: 'Our fantasy opponent strength unknown',
    detail: 'At least one scored week has no strength or pairing for our fantasy opponent.',
  },
  unknown_counterparty_opponent_strength: {
    label: "Counterparty's fantasy opponent strength unknown",
    detail: "At least one scored week has no strength or pairing for the counterparty's fantasy opponent.",
  },
  no_matchup_weeks: {
    label: 'No fantasy matchups in scored weeks',
    detail: 'Every scored week is a fantasy bye, so schedule weighting gives the trade no weight.',
  },
  out: { label: 'Out', detail: 'Out or on IR this week.' },
  nfl_bye: { label: 'NFL bye', detail: "Their NFL team doesn't play this week." },
  no_metrics: { label: 'No metrics for this week', detail: 'No VORP for this week.' },
  unmapped: { label: 'Not mapped', detail: 'No internal player mapping.' },
  unknown_position: { label: 'Position unknown', detail: 'No position on record.' },
}

export function reasonLabel(code: string): ReasonText {
  return REASONS[code] ?? {
    label: `Unrecognized reason (${code})`,
    detail: 'This reason code is not yet recognized by this page.',
  }
}
