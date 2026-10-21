import { afterEach, expect, it, vi } from 'vitest'
import { approveTradeOffer, getTradeProposalStates } from './tradeApproval'
import { ApiError } from './client'
const key = 'a'.repeat(64)
const config = { league_id: '123', team_id: '7', season: 2026, mode: 'live' as const }
afterEach(() => vi.unstubAllGlobals())
it('posts only the validated label using the supplied key', async () => {
  const response = { offer_key: key, status: 'approved', tracking_id: 'track', approved_by: 'Manager', approved_at: '2026-10-06T10:00:00Z', duplicate: false }
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(response), { status: 202 }))
  vi.stubGlobal('fetch', fetch)
  expect(await approveTradeOffer(key, ' Manager ')).toEqual(response)
  expect(fetch.mock.calls[0][0]).toBe(`/v1/trade/offers/${key}/approve`)
  expect(fetch.mock.calls[0][1].method).toBe('POST')
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ approved_by: 'Manager' })
})
it.each(['', ' ', 'x'.repeat(201)])('rejects invalid labels before sending: %s', async label => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
  await expect(approveTradeOffer(key, label)).rejects.toThrow()
  expect(fetch).not.toHaveBeenCalled()
})
it('rejects an invalid key before sending', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
  await expect(approveTradeOffer('wrong', 'Manager')).rejects.toThrow()
  expect(fetch).not.toHaveBeenCalled()
})
it('treats a mismatched success as uncertain', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ offer_key: 'b'.repeat(64), status: 'approved' }), { status: 202 })))
  await expect(approveTradeOffer(key, 'Manager')).rejects.toThrow(/unverified/i)
})
it.each([404, 409, 422, 503, 500])('preserves rejection status %s', async status => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'Reason' }), { status })))
  await expect(approveTradeOffer(key, 'Manager')).rejects.toEqual(new ApiError(status, 'Reason'))
})
it('reads all statuses and pages before applying scope and source filters', async () => {
  const offer = { id: 1, status: 'submitted', league_id: '123', season: 2026, from_team_id: '7', to_team_id: '8', source: 'proposal', offer_key: key }
  const fetch = vi.fn(async (url: string) => {
    const params = new URL(url, 'http://mock').searchParams
    expect(params.get('league_id')).toBe('123'); expect(params.get('season')).toBe('2026')
    const status = params.get('status')
    return new Response(JSON.stringify({ offers: status === 'submitted' ? (params.get('offset') === '0' ? Array.from({ length: 100 }, () => ({ ...offer, from_team_id: '9' })) : [offer, { ...offer, source: 'manual' }]) : [], limit: 100, offset: Number(params.get('offset')) }))
  })
  vi.stubGlobal('fetch', fetch)
  expect(await getTradeProposalStates(config)).toEqual([offer])
  expect(new Set(fetch.mock.calls.map(([url]) => new URL(url, 'http://mock').searchParams.get('status'))).size).toBe(8)
})

it('sends edited text exactly and accepts the new offer identity', async () => {
  const response = { offer_key: 'b'.repeat(64), status: 'approved', tracking_id: 'edited-track', approved_by: 'Manager', approved_at: '2026-10-06T10:00:00Z', duplicate: false }
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(response), { status: 202 }))
  vi.stubGlobal('fetch', fetch)
  expect(await approveTradeOffer(key, 'Manager', '  My message\n第二行  ')).toEqual(response)
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ approved_by: 'Manager', message: '  My message\n第二行  ' })
})
it.each(['', ' ', 'x'.repeat(1001)])('rejects invalid edited messages before publication', async message => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
  await expect(approveTradeOffer(key, 'Manager', message)).rejects.toThrow()
  expect(fetch).not.toHaveBeenCalled()
})
it('accepts a message at the limit', async () => {
  const response = { offer_key: 'b'.repeat(64), status: 'approved', tracking_id: 'track', approved_by: 'Manager', approved_at: '2026-10-06T10:00:00Z', duplicate: false }
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(response), { status: 202 })))
  expect(await approveTradeOffer(key, 'Manager', 'x'.repeat(1000))).toEqual(response)
})
