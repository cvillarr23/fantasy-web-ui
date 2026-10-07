import { expect, it } from 'vitest'
import { reasonLabel } from './tradeScoreReasons'

it.each([
  'unmapped_traded_player', 'unknown_traded_player_position', 'schedule_unavailable',
  'missing_traded_player_metrics', 'no_week_metrics', 'unsupported_lineup_slot', 'lineup_unfillable',
  'no_scored_weeks', 'unknown_our_opponent_strength', 'unknown_counterparty_opponent_strength',
  'no_matchup_weeks', 'out', 'nfl_bye', 'no_metrics', 'unmapped', 'unknown_position',
])('gives core reason %s a plain label and explanation', (code) => {
  const reason = reasonLabel(code)
  expect(reason.label).not.toContain(code)
  expect(reason.label.length).toBeGreaterThan(0)
  expect(reason.detail.length).toBeGreaterThan(0)
})

it('shows an unrecognized code verbatim instead of dropping it', () => {
  const reason = reasonLabel('brand_new_reason')
  expect(reason.label).toContain('brand_new_reason')
  expect(reason.detail).toMatch(/not.*recognized/i)
})
