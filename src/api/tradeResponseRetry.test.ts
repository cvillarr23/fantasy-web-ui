import { afterEach, expect, it, vi } from 'vitest'
import { ApiError } from './client'
import { retryableResponse, retryIncomingDecision } from './tradeResponseRetry'
import type { InboxResponse } from './tradeResponseRetry'

const key = 'a'.repeat(64)
const rejected: InboxResponse = { id: 41, status: 'rejected', action: 'decline', decision_key: key }
const receipt = {
  espn_transaction_id: '123',
  status: 'queued',
  kind: 'decision',
  tracking_id: 'track-2',
  approved_by: 'Manager',
  approved_at: '2026-10-07T18:00:00Z',
  duplicate: false,
  decision_key: key,
  action: 'decline',
  retry_of: 41,
}
afterEach(() => vi.unstubAllGlobals())

it.each([
  ['rejected', 'rejected'],
  ['response_unknown', 'unknown'],
  ['responding', null],
  ['responded', null],
] as const)('treats a %s response as retryable: %s', (status, expected) => {
  expect(retryableResponse({ ...rejected, status })).toBe(expected)
})

it('treats a missing or malformed response as not retryable', () => {
  expect(retryableResponse(null)).toBeNull()
  expect(retryableResponse(undefined)).toBeNull()
  expect(retryableResponse({ ...rejected, id: 0 })).toBeNull()
  expect(retryableResponse({ ...rejected, decision_key: 'short' })).toBeNull()
})

it('posts the claim id, trimmed approver and attestation to the retry route', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(receipt), { status: 202 }))
  vi.stubGlobal('fetch', fetch)
  expect(await retryIncomingDecision('123', rejected, ' Manager ', false, key)).toEqual(receipt)
  expect(fetch.mock.calls[0][0]).toBe('/v1/trade/incoming/123/decision/retry')
  expect(fetch.mock.calls[0][1].method).toBe('POST')
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
    approved_by: 'Manager',
    of_claim_id: 41,
    review_token: key,
    verified_not_answered: false,
  })
})

it('refuses to send an unknown retry without the ESPN check', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
  await expect(retryIncomingDecision('123', { ...rejected, status: 'response_unknown' }, 'Manager', false, key)).rejects.toThrow(/checked ESPN/)
  expect(fetch).not.toHaveBeenCalled()
})

it.each([
  ['a blank approver', rejected, ' '],
  ['a response that is still in flight', { ...rejected, status: 'responding' as const }, 'Manager'],
])('refuses %s before sending', async (_label, response, approver) => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
  await expect(retryIncomingDecision('123', response, approver, true, key)).rejects.toThrow()
  expect(fetch).not.toHaveBeenCalled()
})

it.each([
  { retry_of: 9 },
  { decision_key: 'b'.repeat(64) },
  { action: 'accept' },
  { kind: 'counter' },
  { espn_transaction_id: '999' },
  { tracking_id: '' },
])('treats a mismatched receipt %j as an unknown outcome', async change => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...receipt, ...change }), { status: 202 })))
  await expect(retryIncomingDecision('123', rejected, 'Manager', false, key)).rejects.toThrow(/unverified/i)
})

it.each([404, 409, 422, 503])('preserves rejection status %s', async status => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'Reason' }), { status })))
  await expect(retryIncomingDecision('123', rejected, 'Manager', false, key)).rejects.toEqual(new ApiError(status, 'Reason'))
})

it('accepts a duplicate retry receipt without replaying the publication', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...receipt, duplicate: true })))
  vi.stubGlobal('fetch', fetcher)
  expect(await retryIncomingDecision('123', rejected, 'Manager', false, key)).toMatchObject({ duplicate: true })
  expect(fetcher).toHaveBeenCalledOnce()
})
it.each(['', 'bad', undefined])('refuses an unavailable review token %s before retrying', async token => {
  const fetcher = vi.fn()
  vi.stubGlobal('fetch', fetcher)
  await expect(retryIncomingDecision('123', rejected, 'Manager', false, token as string)).rejects.toThrow(/review version/)
  expect(fetcher).not.toHaveBeenCalled()
})
