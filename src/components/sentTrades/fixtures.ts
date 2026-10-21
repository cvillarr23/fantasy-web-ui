import type { DraftConfig, TradeOffer } from '../../api/types'
import { sentTradeHistory, type SentOutcome, type SentTrade } from '../../api/sentTrades'
import { proposalEvaluation } from '../tradeScore/fixtures'

export const sentConfig: DraftConfig = { league_id: '123', team_id: '7', season: 2026, mode: 'live' }
export const sentNames = { '8': 'Gridiron Ghosts', '9': 'Fourth & Long', '10': 'Waiver Wire Warriors', '11': 'Hail Mary Club', '12': 'Bye Week Bandits' }
export function sentOffer(patch: Partial<TradeOffer> = {}): TradeOffer {
  return {
    id: 1, status: 'submitted', league_id: '123', season: 2026, source: 'proposal',
    offer_key: 'sent-1', from_team_id: '7', to_team_id: '8', executed_at: '2026-10-07T13:02:00Z',
    incoming_player_ids: ['200'], outgoing_player_ids: ['100'],
    incoming_players: [{ espn_id: '200', name: 'Chase Brown' }], outgoing_players: [{ espn_id: '100', name: 'Jameson Williams' }],
    approval: { tracking_id: 'tracking-1', approved_by: 'Conor', approved_at: '2026-10-07T18:40:00Z' },
    message: 'Chase Brown would cover my bye week, and Jameson Williams starts for you. Open to tweaks.',
    drafted_message: 'You are thin at WR and deep at RB. This improves both starting lineups.', message_edited: true, edited_by: 'Conor',
    evaluation: proposalEvaluation(), ...patch,
  }
}
export function sentFixture(patch: Partial<TradeOffer> = {}): SentTrade {
  return sentTradeHistory([sentOffer(patch)])[0]
}
/** Illustrative answered states for the approved design; the current API supplies no answers. */
export function answeredFixture(outcome: SentOutcome, id: number): SentTrade {
  return { ...sentFixture({ id, offer_key: `sent-${id}`, to_team_id: String(id + 7), message_edited: false }), outcome }
}
export function sentFixtures(): SentTrade[] {
  return [sentFixture(), answeredFixture('countered', 2), answeredFixture('accepted', 3), answeredFixture('declined', 4), sentFixture({ id: 5, offer_key: 'sent-5', to_team_id: '12', status: 'submit_blocked', message_edited: false })]
}
