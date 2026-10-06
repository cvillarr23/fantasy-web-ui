import { afterEach, describe, expect, it, vi } from 'vitest'
import { getOutgoingTradeOffers, getTeamNames, triggerWaiverClaim } from './client'
import type { DraftConfig, WaiverPlayerSummary } from './types'

const config = { team_id: '7', league_id: '123' } as DraftConfig
const add: WaiverPlayerSummary = {
  espn_id: '4046', name: 'Some Back', pro_team: 'KC', injury_status: null, net_vorp: 9,
}
const drop: WaiverPlayerSummary = {
  espn_id: '9999', name: 'Bench Back', pro_team: 'NO', injury_status: null, net_vorp: 1,
}

afterEach(() => vi.unstubAllGlobals())

describe('triggerWaiverClaim', () => {
  it('sends ESPN identities and returns the publisher tracking ID', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: 'accepted', team_id: '7', queue: 'waiver_actions', tracking_id: 'track-123',
    }), { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await triggerWaiverClaim(config, add, drop)

    expect(result.tracking_id).toBe('track-123')
    expect(fetchMock).toHaveBeenCalledOnce()
    const [path, init] = fetchMock.mock.calls[0]
    expect(path).toBe('/v1/trigger/waiver')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({
      idempotency_key: expect.any(String),
      team_id: '7',
      player_id: '4046',
      name: 'Some Back',
      team: 'KC',
      dry_run: false,
      drop_player_id: '9999',
    })
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
  })

  it('sends dry_run=true only when asked', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ tracking_id: 't' }), { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)

    await triggerWaiverClaim(config, add, drop, 'key', true)

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).dry_run).toBe(true)
  })

  it('omits drop_player_id for an add-only request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ tracking_id: 'track-456' }), { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)

    await triggerWaiverClaim(config, add)

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      idempotency_key: expect.any(String),
      team_id: '7',
      player_id: '4046',
      name: 'Some Back',
      team: 'KC',
      dry_run: false,
    })
  })

  it('turns backend validation details into an actionable error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      detail: [{ loc: ['body', 'team'], msg: 'Field required', type: 'missing' }],
    }), { status: 422 })))

    await expect(triggerWaiverClaim(config, add)).rejects.toThrow('team: Field required')
  })
})

describe('getOutgoingTradeOffers', () => {
  const scope = { league_id: '123', team_id: '7', season: 2026 } as DraftConfig
  const offer = (id: number, overrides = {}) => ({
    id, status: 'awaiting_approval', league_id: '123', season: 2026,
    source: 'proposal', from_team_id: '7', to_team_id: '8',
    incoming_player_ids: ['4046'], outgoing_player_ids: ['9999'],
    incoming_players: [{ espn_id: '4046', name: 'Some Back' }],
    outgoing_players: [{ espn_id: '9999', name: 'Bench Back' }],
    executed_at: '2026-10-05T13:00:00Z', message: 'An offer', ...overrides,
  })

  it('reads every page before filtering to our outgoing proposals, preserving ESPN identities', async () => {
    const firstPage = Array.from({ length: 100 }, (_, id) => offer(id, { from_team_id: '9' }))
    const expected = offer(100)
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ offers: firstPage, limit: 100, offset: 0 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ offers: [expected], limit: 100, offset: 100 })))
    vi.stubGlobal('fetch', fetchMock)

    expect(await getOutgoingTradeOffers(scope)).toEqual([expected])
    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
      '/v1/trade/offers?status=awaiting_approval&league_id=123&season=2026&limit=100&offset=0',
      '/v1/trade/offers?status=awaiting_approval&league_id=123&season=2026&limit=100&offset=100',
    ])
    expect(fetchMock.mock.calls.every(([, init]) => !init.method || init.method === 'GET')).toBe(true)
  })

  it('excludes other scopes, reactive counters, incomplete teams and nonpending offers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ offers: [
      offer(1, { league_id: '456' }), offer(2, { season: 2025 }),
      offer(3, { from_team_id: '8' }), offer(4, { source: 'counter' }),
      offer(5, { to_team_id: null }), offer(6, { to_team_id: '7' }),
      offer(7, { status: 'submitted' }), offer(8, { source: null }),
    ], limit: 100, offset: 0 }))))
    expect(await getOutgoingTradeOffers(scope)).toEqual([])
  })

  it('fails rather than displaying an incomplete list when a later page fails', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ offers: Array.from({ length: 100 }, (_, id) => offer(id)), limit: 100, offset: 0 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: 'Offers unavailable' }), { status: 503 })))
    await expect(getOutgoingTradeOffers(scope)).rejects.toThrow('Offers unavailable')
  })
})

it('scopes proposal team-name lookups to the selected league', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ '8': 'Rival Team' })))
  vi.stubGlobal('fetch', fetchMock)
  expect(await getTeamNames('123')).toEqual({ '8': 'Rival Team' })
  expect(fetchMock.mock.calls[0][0]).toBe('/v1/league/teams?league_id=123')
})
