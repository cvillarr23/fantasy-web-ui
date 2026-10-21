import { afterEach, expect, it, vi } from 'vitest'
import { ApiError, getTradeCandidates } from './client'

afterEach(() => vi.unstubAllGlobals())
it('requests candidate filters with their API names and preserves null metrics', async () => {
  const payload = { items: [{ final_score: null, receive: [{ espn_id: '-16002', player_id: null }] }] }
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload)))
  vi.stubGlobal('fetch', fetcher)
  expect(await getTradeCandidates({ league_id: '123', season: 2026, week: 5, counterparty_team_id: '8', receive_position: 'D/ST', send_position: 'RB', shape: '2for1', status: 'all', sort: 'their_benefit', limit: 25, offset: 50 })).toEqual(payload)
  const url = new URL(fetcher.mock.calls[0][0], 'http://localhost')
  expect(url.pathname).toBe('/v1/trade/candidates')
  expect(Object.fromEntries(url.searchParams)).toEqual({ league_id: '123', season: '2026', week: '5', counterparty_team_id: '8', receive_position: 'D/ST', send_position: 'RB', shape: '2for1', status: 'all', sort: 'their_benefit', limit: '25', offset: '50' })
})
it('omits unselected filters and passes cancellation through', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response('{}'))
  vi.stubGlobal('fetch', fetcher)
  const controller = new AbortController()
  await getTradeCandidates({ league_id: '123', season: 2026, week: 5, receive_position: '', send_position: '', counterparty_team_id: '' }, controller.signal)
  expect(fetcher.mock.calls[0][0]).toBe('/v1/trade/candidates?league_id=123&season=2026&week=5')
  controller.abort()
  expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true)
})
it('keeps the missing-job 404 distinct from an empty run', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'Run trade_candidates first' }), { status: 404 })))
  await expect(getTradeCandidates({ league_id: '123', season: 2026, week: 5 })).rejects.toEqual(new ApiError(404, 'Run trade_candidates first'))
})
