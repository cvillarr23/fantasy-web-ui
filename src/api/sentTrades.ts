import { request } from './client'
import { tradeOfferStatuses } from './tradeApproval'
import type { DraftConfig, TradeOffer, TradeOfferList } from './types'

export type SentOutcome = 'waiting' | 'countered' | 'accepted' | 'declined' | 'not_sent'
export interface SentTrade {
  key: string
  offer: TradeOffer
  status: string
  outcome: SentOutcome
  conflict: boolean
  stagedAt: string | null
}
export interface TradeEvent { title: string; detail: string; current?: boolean }

export async function getSentTradeOffers(config: DraftConfig): Promise<TradeOffer[]> {
  const pages = await Promise.all([...tradeOfferStatuses, 'superseded'].map(async status => {
    const offers: TradeOffer[] = []
    for (let offset = 0; ; offset += 100) {
      const params = new URLSearchParams({ status, league_id: config.league_id, season: String(config.season), limit: '100', offset: String(offset) })
      const page = await request<TradeOfferList>(`/v1/trade/offers?${params}`)
      offers.push(...page.offers.filter(offer => offer.status === status && offer.league_id === config.league_id
        && offer.season === config.season && offer.from_team_id === config.team_id
        && !!offer.to_team_id && offer.to_team_id !== config.team_id
        && ['proposal', 'manual', 'counter_offer'].includes(offer.source || '')))
      if (page.offers.length < 100) return offers
    }
  }))
  return pages.flat()
}

export function sentTradeHistory(rows: TradeOffer[]): SentTrade[] {
  const groups = new Map<string, TradeOffer[]>()
  for (const row of rows) {
    if (row.status === 'superseded') continue
    const key = row.offer_key || `row-${row.id}`
    groups.set(key, [...(groups.get(key) || []), row])
  }
  const result: SentTrade[] = []
  for (const [key, group] of groups) {
    const sorted = [...group].sort((a, b) => b.executed_at.localeCompare(a.executed_at) || b.id - a.id)
    const approved = sorted.find(row => row.approval?.approved_at)
    if (!approved && !sorted.some(row => ['approved', 'approval_pending', 'submitting', 'submitted'].includes(row.status))) continue
    const active = sorted.filter(row => row.status !== 'awaiting_approval')
    const terminalRank = (row: TradeOffer) => ['submitted', 'failure', 'submit_blocked', 'dry_run_filled'].includes(row.status) ? 1 : 0
    const worker = active.filter(row => !['approved', 'approval_pending'].includes(row.status))
      .sort((a, b) => terminalRank(b) - terminalRank(a))
      .filter((row, index, snapshots) => snapshots.findIndex(snapshot => snapshot.id === row.id) === index)
    // Concurrent status reads can observe the same submission on both sides of its transition.
    const submitted = worker.find(row => row.status === 'submitted')
    const compatible = submitted ? worker.filter(row => row.status !== 'submitting') : worker
    const conflict = new Set(compatible.map(row => row.status)).size > 1
    const status = conflict ? 'unconfirmed' : submitted?.status || worker[0]?.status || active[0]?.status || 'awaiting_approval'
    const base = approved || sorted[0]
    const evidence = sorted.find(row => row.evaluation != null)
    const edited = sorted.find(row => row.message_edited)
    const offer = { ...sorted[0], ...base, ...(edited ? { message: edited.message, drafted_message: edited.drafted_message, message_edited: true, edited_by: edited.edited_by } : {}), evaluation: evidence?.evaluation ?? base.evaluation }
    const outcome: SentOutcome = ['submit_blocked', 'dry_run_filled', 'awaiting_approval', 'failure'].includes(status) ? 'not_sent' : 'waiting'
    // Execution timestamps on worker rows are claim times, not confirmed send times.
    const stagedAt = group.find(row => ['awaiting_approval', 'approved', 'approval_pending'].includes(row.status))?.executed_at || null
    result.push({ key, offer, status, outcome, conflict, stagedAt })
  }
  return result.sort((a, b) => (b.offer.approval?.approved_at || b.offer.executed_at).localeCompare(a.offer.approval?.approved_at || a.offer.executed_at))
}

export function dateLabel(value?: string | null): string {
  return value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Time not recorded'
}
export function tradeTimeline(trade: SentTrade): TradeEvent[] {
  const { offer, status } = trade
  const events: TradeEvent[] = [{ title: offer.source === 'proposal' ? 'Staged by the trade scan' : 'Offer staged', detail: trade.stagedAt ? dateLabel(trade.stagedAt) : 'Staging time not recorded' }]
  if (offer.message_edited) events.push({ title: 'Message edited', detail: `By ${offer.edited_by || 'an unrecorded editor'} · edit time not recorded` })
  events.push({ title: 'Approved', detail: `${dateLabel(offer.approval?.approved_at)} · by ${offer.approval?.approved_by || 'an unrecorded approver'}` })
  if (trade.conflict) return [...events, { title: 'Submission unconfirmed', detail: 'Conflicting worker records; check ESPN before taking action.', current: true }]
  if (status === 'submitted' || ['accepted', 'declined', 'countered'].includes(trade.outcome)) {
    events.push({ title: 'Sent on ESPN', detail: 'Worker confirmed submission. Send time and roster re-check evidence are not exposed.' })
    events.push({ title: trade.outcome === 'waiting' ? 'Their answer' : outcomeLabels[trade.outcome], detail: trade.outcome === 'waiting' ? 'Waiting · their answer is not recorded by this API yet; check ESPN.' : trade.outcome === 'countered' ? 'Open the Inbox to review their counter.' : 'Recorded outcome.', current: true })
  } else if (trade.outcome === 'not_sent') {
    events.push({ title: 'Not sent', detail: offer.approval?.publish_error || (status === 'dry_run_filled' ? 'Dry run only; no offer was sent.' : status === 'failure' ? 'The worker recorded a definite failure before sending or an ESPN rejection. The specific reason is not exposed.' : 'Worker submission gates blocked the offer. The specific reason is not exposed.'), current: true })
  } else {
    const queued = status === 'approved'
    events.push({ title: queued ? 'Queued for ESPN' : status === 'approval_pending' ? 'Publication unconfirmed' : 'Submission unconfirmed', detail: queued ? 'Approval was queued; ESPN submission is not yet confirmed.' : 'The send outcome is unknown. Check ESPN before taking action.', current: true })
  }
  return events
}
export const outcomeLabels: Record<SentOutcome, string> = { waiting: 'Waiting', countered: 'Countered', accepted: 'Accepted', declined: 'Declined', not_sent: 'Not sent' }
export function sentStatusLine(trade: SentTrade): string {
  if (trade.conflict) return 'Conflicting records · check ESPN'
  if (trade.outcome === 'accepted') return 'Accepted · players moved on ESPN'
  if (trade.outcome === 'declined') return 'Declined by the other manager'
  if (trade.outcome === 'countered') return 'They countered · see it in the Inbox'
  if (trade.outcome === 'not_sent') return 'Not sent · see what happened below'
  return trade.status === 'submitted' ? 'Sent on ESPN · waiting for their answer'
    : trade.status === 'approved' ? 'Queued · ESPN submission not yet confirmed'
      : 'Send outcome unconfirmed · check ESPN'
}
