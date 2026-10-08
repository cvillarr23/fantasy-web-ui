import { request } from './client'
import type { DraftConfig } from './types'
import type {
  CounterRequest,
  DecisionRequest,
  InboxFilter,
  InboxVisibility,
  IncomingTrade,
  PublicationReceipt,
  TriageRequest,
} from './tradeInboxTypes'
export async function getIncomingTrades(
  config: DraftConfig,
  status: InboxFilter,
  visibility: InboxVisibility,
  limit = 100,
): Promise<IncomingTrade[]> {
  const rows: IncomingTrade[] = []
  for (let offset = 0; ; offset += limit) {
    const params = new URLSearchParams({
      league_id: config.league_id,
      season: String(config.season),
      status,
      visibility,
      limit: String(limit),
      offset: String(offset),
    })
    const page = await request<{
      offers: IncomingTrade[]
      limit: number
      offset: number
    }>(`/v1/trade/incoming?${params}`)
    if (!page || !Array.isArray(page.offers))
      throw new Error('Inbox response could not be verified.')
    rows.push(
      ...page.offers.filter(
        (row) =>
          row.league_id === config.league_id &&
          row.season === config.season &&
          row.our_team_id === config.team_id,
      ),
    )
    if (page.offers.length < limit) return rows
  }
}
export async function publishIncoming(
  id: string,
  body: DecisionRequest | CounterRequest,
): Promise<PublicationReceipt> {
  const kind = 'action' in body ? 'decision' : 'counter'
  const result = await request<PublicationReceipt>(
    `/v1/trade/incoming/${encodeURIComponent(id)}/${kind}`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  if (
    !result ||
    result.espn_transaction_id !== id ||
    result.kind !== kind ||
    result.status !== 'queued' ||
    typeof result.tracking_id !== 'string' ||
    !result.tracking_id.trim() ||
    typeof result.approved_by !== 'string' ||
    !result.approved_by.trim() ||
    typeof result.approved_at !== 'string' ||
    !Number.isFinite(Date.parse(result.approved_at)) ||
    typeof result.duplicate !== 'boolean' ||
    (kind === 'decision'
      ? result.action !== ('action' in body && body.action) ||
        !/^[a-f0-9]{64}$/.test(result.decision_key ?? '')
      : result.action !== null || result.decision_key !== null)
  ) {
    throw new Error('Publication receipt is unverified; outcome is unknown.')
  }
  return result
}
export async function triageIncoming(id: string, body: TriageRequest): Promise<IncomingTrade> {
  const row = await request<IncomingTrade>(`/v1/trade/incoming/${encodeURIComponent(id)}/triage`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!row || row.espn_transaction_id !== id || row.triage?.state !== body.state)
    throw new Error('Triage outcome could not be verified. Refresh before retrying.')
  return row
}
