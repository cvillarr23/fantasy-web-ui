import { request } from './client'
import type { DraftConfig, TradeOffer, TradeOfferList } from './types'

export const tradeOfferStatuses = ['awaiting_approval', 'approval_pending', 'approved', 'submit_blocked', 'dry_run_filled', 'submitting', 'submitted', 'failure'] as const
export type TradeOfferStatus = typeof tradeOfferStatuses[number]
export interface TradeApprovalResponse {
  offer_key: string
  status: 'approved'
  tracking_id: string
  approved_by: string
  approved_at: string
  duplicate: boolean
}
export function validApprover(label: string) {
  return label.length >= 1 && label.length <= 200 && Boolean(label.trim())
}
export function validOfferKey(key: unknown): key is string {
  return typeof key === 'string' && /^[0-9a-f]{64}$/.test(key)
}
export async function approveTradeOffer(offerKey: string, label: string): Promise<TradeApprovalResponse> {
  if (!validOfferKey(offerKey) || !validApprover(label)) throw new Error('Invalid offer key or approver label')
  const result = await request<TradeApprovalResponse>(`/v1/trade/offers/${offerKey}/approve`, {
    method: 'POST', body: JSON.stringify({ approved_by: label.trim() }),
  })
  if (!result || result.offer_key !== offerKey || result.status !== 'approved' ||
      typeof result.tracking_id !== 'string' || !result.tracking_id.trim() ||
      typeof result.approved_by !== 'string' || !result.approved_by.trim() ||
      typeof result.approved_at !== 'string' || !Number.isFinite(Date.parse(result.approved_at)) ||
      typeof result.duplicate !== 'boolean') {
    throw new Error('Approval response is unverified; publication outcome is unknown.')
  }
  return result
}
export async function getTradeProposalStates(config: DraftConfig): Promise<TradeOffer[]> {
  const pages = await Promise.all(tradeOfferStatuses.map(async status => {
    const offers: TradeOffer[] = []
    const limit = 100
    for (let offset = 0; ; offset += limit) {
      const params = new URLSearchParams({ status, league_id: config.league_id, season: String(config.season), limit: String(limit), offset: String(offset) })
      const page = await request<TradeOfferList>(`/v1/trade/offers?${params}`)
      offers.push(...page.offers.filter(offer => offer.status === status && offer.league_id === config.league_id && offer.season === config.season && offer.from_team_id === config.team_id && offer.source === 'proposal'))
      if (page.offers.length < limit) return offers
    }
  }))
  return pages.flat()
}
