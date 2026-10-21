import { afterEach, expect, it, vi } from 'vitest'
import { getSentTradeOffers, sentTradeHistory, tradeTimeline } from './sentTrades'
import type { TradeOffer } from './types'

const config = { league_id: '123', team_id: '7', season: 2026, mode: 'live' as const }
const row = (status: string, patch: Partial<TradeOffer> = {}): TradeOffer => ({
  id: 1, status, league_id: '123', season: 2026, from_team_id: '7', to_team_id: '8', source: 'proposal',
  offer_key: 'a', executed_at: '2026-10-01T12:00:00Z', incoming_player_ids: ['200'], outgoing_player_ids: ['100'],
  incoming_players: [{ espn_id: '200', name: 'Receiver' }], outgoing_players: [{ espn_id: '100', name: 'Sender' }],
  ...patch,
})
const approval = { tracking_id: 'track', approved_by: 'Manager', approved_at: '2026-10-02T12:00:00Z' }
afterEach(() => vi.unstubAllGlobals())

it('reads every status and page before filtering team, league, season and source', async () => {
  const calls: URLSearchParams[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const params = new URL(url, 'http://test').searchParams
    calls.push(params)
    const status = params.get('status')!
    const offers = status !== 'submitted' ? [] : params.get('offset') === '0'
      ? Array.from({ length: 100 }, () => row(status, { from_team_id: '9' }))
      : [row(status), row(status, { source: 'manual', id: 2 }), row(status, { source: 'counter_offer', id: 3 }), row(status, { league_id: 'other' }), row(status, { season: 2025 }), row(status, { source: 'unknown' })]
    return new Response(JSON.stringify({ offers, limit: 100, offset: Number(params.get('offset')) }))
  }))
  expect((await getSentTradeOffers(config)).map(r => r.id)).toEqual([1, 2, 3])
  expect(new Set(calls.map(p => p.get('status')))).toEqual(new Set(['awaiting_approval', 'approval_pending', 'approved', 'superseded', 'submit_blocked', 'dry_run_filled', 'submitting', 'submitted', 'failure']))
  expect(calls.every(p => p.get('league_id') === '123' && p.get('season') === '2026')).toBe(true)
})
it('combines approval and worker rows and retains the edited message metadata', () => {
  const history = sentTradeHistory([row('submitted', { id: 2, executed_at: '2026-10-02T12:01:00Z' }), row('approved', { approval, message: 'Edited', drafted_message: 'Draft', message_edited: true, edited_by: 'Editor' }), row('superseded', { offer_key: 'old' }), row('awaiting_approval', { offer_key: 'unapproved' })])
  expect(history).toHaveLength(1)
  expect(history[0].offer).toMatchObject({ approval, message: 'Edited', edited_by: 'Editor' })
  expect(history[0].status).toBe('submitted')
  expect(history[0].outcome).toBe('waiting')
  expect(tradeTimeline(history[0]).map(e => e.title)).toEqual(['Staged by the trade scan', 'Message edited', 'Approved', 'Sent on ESPN', 'Their answer'])
  expect(tradeTimeline(history[0]).find(e => e.title === 'Message edited')?.detail).toContain('Editor')
})
it.each([
  ['approved', 'waiting', 'Queued for ESPN'], ['approval_pending', 'waiting', 'Publication unconfirmed'],
  ['submitting', 'waiting', 'Submission unconfirmed'], ['submit_blocked', 'not_sent', 'Not sent'],
  ['dry_run_filled', 'not_sent', 'Not sent'], ['failure', 'not_sent', 'Not sent'],
])('keeps %s truthful without inferring an ESPN outcome', (status, outcome, title) => {
  const trade = sentTradeHistory([row(status, { approval })])[0]
  expect(trade.outcome).toBe(outcome)
  expect(tradeTimeline(trade).some(e => e.title === title)).toBe(true)
  expect(tradeTimeline(trade).some(e => e.title === 'Sent on ESPN')).toBe(false)
})
it('retains a proven publication failure but omits unapproved dry fills and superseded drafts', () => {
  expect(sentTradeHistory([row('awaiting_approval', { approval: { ...approval, publish_error: 'Failed before publication; approval may be retried.' } })])[0].outcome).toBe('not_sent')
  expect(sentTradeHistory([row('superseded', { approval }), row('dry_run_filled', { offer_key: 'other' })])).toEqual([])
})
it('does not guess away contradictory worker records', () => {
  const trade = sentTradeHistory([row('submitted'), row('submit_blocked', { id: 2, approval })])[0]
  expect(trade.outcome).toBe('waiting')
  expect(tradeTimeline(trade).at(-1)?.detail).toMatch(/conflicting/i)
})

it('treats submitting followed by submitted as a confirmed send across status snapshots', () => {
  for (const id of [1, 2]) {
    const trade = sentTradeHistory([row('submitting', { id, approval }), row('submitted', { id: 1 })])[0]
    expect(trade.conflict).toBe(false)
    expect(trade.status).toBe('submitted')
    expect(tradeTimeline(trade).map(e => e.title)).toContain('Sent on ESPN')
  }
})

it('keeps terminal failure over a submitting snapshot of the same row', () => {
  const trade = sentTradeHistory([row('submitting', { approval }), row('failure', { approval })])[0]
  expect(trade.conflict).toBe(false)
  expect(trade.outcome).toBe('not_sent')
})
