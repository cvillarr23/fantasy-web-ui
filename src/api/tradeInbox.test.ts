import { afterEach, expect, it, vi } from 'vitest'
import { getIncomingTrades, publishIncoming, triageIncoming } from './tradeInbox'
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
      comment: 'Yes',
    }),
  ).toMatchObject({ duplicate: true, status: 'queued' })
  expect(fetcher.mock.calls[0][0]).toBe('/v1/trade/incoming/123/decision')
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
    action: 'accept',
    approved_by: 'Manager',
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
    publishIncoming('123', { action: 'accept', approved_by: 'Manager' }),
  ).rejects.toThrow(/unknown/i)
})
it('counter posts a week and audit label only', async () => {
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
  await publishIncoming('123', { week: 5, approved_by: 'Manager' })
  expect(fetcher.mock.calls[0][0]).toContain('/counter')
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
    week: 5,
    approved_by: 'Manager',
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
