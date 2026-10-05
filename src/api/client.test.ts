import { afterEach, describe, expect, it, vi } from 'vitest'
import { triggerWaiverClaim } from './client'
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
      drop_player_id: '9999',
    })
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
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
    })
  })

  it('turns backend validation details into an actionable error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      detail: [{ loc: ['body', 'team'], msg: 'Field required', type: 'missing' }],
    }), { status: 422 })))

    await expect(triggerWaiverClaim(config, add)).rejects.toThrow('team: Field required')
  })
})
