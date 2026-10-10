import { afterEach, expect, it, vi } from 'vitest'
import { getIncomingThread, getIncomingTrades, publishIncoming, triageIncoming } from './tradeInbox'
import { config, offer, receipt } from '../components/inbox/inboxFixtures'
afterEach(() => vi.unstubAllGlobals())
it('preserves server rank across pages and filters only exact configured scope', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          offers: [offer, { ...offer, id: 2, our_team_id: '9' }],
          limit: 2,
          offset: 0,
        }),
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          offers: [{ ...offer, id: 3, espn_transaction_id: '456' }],
          limit: 2,
          offset: 2,
        }),
      ),
    )
  vi.stubGlobal('fetch', fetcher)
  const rows = await getIncomingTrades(config, 'live', 'all', 2)
  expect(rows.map((r) => r.id)).toEqual([1, 3])
  expect(fetcher.mock.calls[1][0]).toContain('offset=2')
  expect(fetcher.mock.calls[0][0]).toContain('visibility=all')
})
it('posts exact decision body and accepts a duplicate queue receipt', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ ...receipt, duplicate: true })))
  vi.stubGlobal('fetch', fetcher)
  expect(
    await publishIncoming('123', {
      action: 'accept',
      approved_by: 'Manager',
    review_token: offer.review_token,
      comment: 'Yes',
    }),
  ).toMatchObject({ duplicate: true, status: 'queued' })
  expect(fetcher.mock.calls[0][0]).toBe('/v1/trade/incoming/123/decision')
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
    action: 'accept',
    approved_by: 'Manager',
    review_token: offer.review_token,
    comment: 'Yes',
  })
})
it.each([
  { ...receipt, status: 'accepted' },
  { ...receipt, espn_transaction_id: '999' },
  { ...receipt, kind: 'counter' },
  { ...receipt, action: 'decline' },
  { ...receipt, tracking_id: '' },
])('rejects an unverified receipt', async (bad) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(bad))))
  await expect(
    publishIncoming('123', { action: 'accept', approved_by: 'Manager', review_token: offer.review_token }),
  ).rejects.toThrow(/unknown/i)
})
it('counter posts the reviewed token, week and audit label', async () => {
  const fetcher = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        ...receipt,
        kind: 'counter',
        action: null,
        decision_key: null,
      }),
    ),
  )
  vi.stubGlobal('fetch', fetcher)
  await publishIncoming('123', { week: 5, approved_by: 'Manager', review_token: offer.review_token })
  expect(fetcher.mock.calls[0][0]).toContain('/counter')
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
    week: 5,
    approved_by: 'Manager',
    review_token: offer.review_token,
  })
})
it('triage sends aware snooze timestamp without decision fields', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ ...offer, triage: { state: 'snoozed' } })))
  vi.stubGlobal('fetch', fetcher)
  await triageIncoming('123', {
    state: 'snoozed',
    by: 'Manager',
    snooze_until: '2026-10-09T12:00:00Z',
  })
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
    state: 'snoozed',
    by: 'Manager',
    snooze_until: '2026-10-09T12:00:00Z',
  })
})
const thread = {
  thread_root_id: '100',
  state: 'awaiting_us',
  our_counters: 1,
  counter_limit: 3,
  turns: [
    { side: 'theirs', espn_transaction_id: '100', status: 'countered' },
    { side: 'ours', espn_transaction_id: 'ours-1', status: 'countered', counters: '100' },
    { side: 'theirs', espn_transaction_id: '123', status: 'open' },
  ],
}
it('reads an offer thread scoped to the configured league', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(thread)))
  vi.stubGlobal('fetch', fetcher)
  expect(await getIncomingThread(config, '123')).toEqual(thread)
  expect(fetcher.mock.calls[0][0]).toContain('/v1/trade/incoming/123/thread?league_id=123')
})
it.each([
  [{ ...thread, turns: thread.turns.slice(0, 2) }],
  [{ ...thread, our_counters: '1' }],
  [{ ...thread, turns: null }],
])('refuses a thread that does not include the offer or is malformed: %#', async (body) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body))))
  await expect(getIncomingThread(config, '123')).rejects.toThrow(/could not be verified/)
})
