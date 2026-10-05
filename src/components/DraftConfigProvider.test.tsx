import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import { DraftConfigProvider } from './DraftConfigProvider'
import { invalidateRoster, queryClient } from '../api/queryClient'
import { getDraftConfig } from '../api/client'
import { CONFIG_STORAGE_KEY } from '../hooks/useDraftConfig'
import type { DraftConfig } from '../api/types'

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>()
  return { ApiError: actual.ApiError, getDraftConfig: vi.fn(), setDraftConfig: vi.fn() }
})

const stored: DraftConfig = { league_id: '123', team_id: '8', season: 2026, mode: 'live' }
const readKey = ['matchup', '123', '8', 2026, 5]

beforeEach(() => {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(stored))
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  localStorage.clear()
})

async function mountWithServerConfig(server: DraftConfig) {
  let resolve: (config: DraftConfig) => void = () => {}
  vi.mocked(getDraftConfig).mockReturnValue(new Promise((r) => { resolve = r }))
  render(<DraftConfigProvider><div /></DraftConfigProvider>)
  // Reads fetched while the server copy is still on its way, as on every page load.
  queryClient.setQueryData(readKey, { cached: true })
  resolve(server)
  await waitFor(() => expect(localStorage.getItem(CONFIG_STORAGE_KEY)).toContain('"mode":"live"'))
}

it('keeps reads cached when the server config matches the stored one', async () => {
  await mountWithServerConfig({ ...stored })
  await waitFor(() => expect(getDraftConfig).toHaveBeenCalled())
  expect(queryClient.getQueryData(readKey)).toEqual({ cached: true })
})

it('clears cached reads when the server config is a different league', async () => {
  await mountWithServerConfig({ ...stored, league_id: '456' })
  await waitFor(() => expect(queryClient.getQueryData(readKey)).toBeUndefined())
})

it('invalidates every read a move can change', async () => {
  const keys = [
    ['matchup', '123', '8', 2026, 5],
    ['scoreboard', '123', 2026, 5],
    ['lineup-roster', '123', '8', 2026, 5],
    ['roster-deficits', '123', 2026, 5],
    ['waiver-recommendations', '123', 2026, 5],
    ['league', '123', 2026, 'standings'],
  ]
  for (const key of keys) queryClient.setQueryData(key, {})
  queryClient.setQueryData(['team-names'], {})
  await invalidateRoster()
  for (const key of keys) expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true)
  expect(queryClient.getQueryState(['team-names'])?.isInvalidated).toBe(false)
})
