import { expect, it } from 'vitest'
import { LIVE_REFETCH_MS, liveRefetchInterval, livePlayersQuery } from './liveReads'
import type { LiveBlock } from './types'

const block = (status: LiveBlock['status']) => ({ status } as LiveBlock)

it('polls every 30s only while a player is in progress', () => {
  expect(liveRefetchInterval({ players: { a: block('final'), b: block('in_progress') } }, false)).toBe(LIVE_REFETCH_MS)
  expect(liveRefetchInterval({ players: { a: block('final'), b: null } }, false)).toBe(false)
  expect(liveRefetchInterval({ players: { a: block('not_started') } }, false)).toBe(false)
  expect(liveRefetchInterval(undefined, false)).toBe(false)
})

it('stops polling while the tab is hidden', () => {
  expect(liveRefetchInterval({ players: { a: block('in_progress') } }, true)).toBe(false)
})

it('keys by the sorted, de-duplicated ids and skips an empty list', () => {
  expect(livePlayersQuery(['b', 'a', 'b']).queryKey).toEqual(['live-players', ['a', 'b']])
  expect(livePlayersQuery([]).enabled).toBe(false)
})
