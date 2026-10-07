import { afterEach, expect, it, vi } from 'vitest'
import { getTradeContext } from './client'
afterEach(() => vi.unstubAllGlobals())
it('requests the exact configured scope and horizon, preserving nulls and ESPN identities', async () => {
  const payload = { teams: { '2': { roster: [{ espn_id: '-16002', player_id: null }], schedule_strength_z: null } } }
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload)))
  vi.stubGlobal('fetch', fetchMock)
  expect(await getTradeContext('123', 2026, 5, 4)).toEqual(payload)
  expect(fetchMock.mock.calls[0][0]).toBe('/v1/trade/context?league_id=123&season=2026&week=5&horizon=4')
})
it('surfaces core read errors', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'Missing stored history' }), { status: 503 })))
  await expect(getTradeContext('123', 2026, 5, 4)).rejects.toThrow('Missing stored history')
})
