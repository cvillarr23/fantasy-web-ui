import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LineupPage } from './LineupPage'
import { WaiverPage } from './WaiverPage'
import { TradePage } from './TradePage'
import { getCurrentWeek, getLineupRoster, triggerLineupSwap } from '../api/client'
import { CONFIG_STORAGE_KEY } from '../hooks/useDraftConfig'
import type { LineupPlayerLine, LineupRosterResponse } from '../api/types'

vi.mock('../api/client', () => ({
  getLineupRoster: vi.fn(), triggerLineupSwap: vi.fn(),
  getCurrentWeek: vi.fn().mockResolvedValue({ week: 5 }),
  getRosterDeficits: vi.fn().mockResolvedValue({ teams: {} }),
  getWaiverRecommendations: vi.fn().mockResolvedValue({ recommendations: [] }),
  getMatchup: vi.fn().mockRejectedValue(new Error('No matchup')),
  evaluateTrade: vi.fn(), searchPlayers: vi.fn().mockResolvedValue([]),
}))
vi.mock('./RosterDeficitsGrid', () => ({ RosterDeficitsGrid: () => <div>Roster deficits</div> }))
Object.defineProperty(window, 'matchMedia', {
  writable: true, value: vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })),
})

const player = (id: string, slot: string): LineupPlayerLine => ({
  player_id: id, espn_id: `espn-${id}`, name: id, position: 'RB', slot, pro_team: 'KC',
  jersey: null, injury_status: null, headshot_url: '', deficit_flag: false,
  suggested_swap: null, net_vorp: 5, rumor_sentiment: null, rumor_confidence: null, rumor_suggested_action: null,
})
const roster: LineupRosterResponse = {
  starters: [{ ...player('Starter', 'RB'), suggested_swap: { bench_for: 'Starter', add_player_id: 'Backup' } }],
  bench: [player('Backup', 'BE')],
}
const key = 'fantasy.lineup-draft:123:8:2026:5'
beforeEach(() => {
  localStorage.setItem(
    CONFIG_STORAGE_KEY,
    JSON.stringify({ league_id: '123', team_id: '8', season: 2026, mode: 'live' }),
  )
  vi.mocked(getCurrentWeek).mockResolvedValue({week: 5})
  vi.mocked(getLineupRoster).mockResolvedValue(roster)
  vi.mocked(triggerLineupSwap).mockResolvedValue({ tracking_id: 'lineup-123' })
})
afterEach(() => { cleanup(); vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear() })
function start(url = '/lineup?week=7') {
  return render(<MantineProvider><MemoryRouter initialEntries={[url]}><Routes>
    <Route path="/lineup" element={<LineupPage />} />
    <Route path="/waivers" element={<WaiverPage />} />
    <Route path="/trades" element={<TradePage />} />
  </Routes></MemoryRouter></MantineProvider>)
}

it('keeps drafts week-scoped and prevents submitting a planning week', async () => {
  start('/lineup?week=5')
  fireEvent.click(await screen.findByRole('button', { name: 'Apply hint' }))
  fireEvent.click(screen.getByRole('button', { name: 'Next week' }))
  await waitFor(() => expect(screen.queryByText('Starter → bench, Backup → RB')).toBeNull())
  fireEvent.click(screen.getByRole('link', { name: 'Find waiver upgrades' }))
  fireEvent.click(await screen.findByRole('link', { name: 'Back to lineup · Week 6' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Apply hint' }))
  expect((screen.getByRole('button', {name: 'Submit lineup changes'}) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', {name: 'Previous week'}))
  expect(await screen.findByText('Starter → bench, Backup → RB')).toBeTruthy()
  await waitFor(() => expect((screen.getByRole('button', {name: 'Submit lineup changes'}) as HTMLButtonElement).disabled).toBe(false))
  fireEvent.click(screen.getByRole('button', {name: 'Submit lineup changes'}))
  await waitFor(() => expect(triggerLineupSwap).toHaveBeenCalledWith('8', [{drop_player_id:'espn-Starter',add_player_id:'espn-Backup',slot:'RB'}], expect.any(String)))
  await waitFor(() => expect(sessionStorage.getItem(key)).toBe('[]'))
})

it('removes stale swaps when the roster changes while away', async () => {
  start()
  fireEvent.click(await screen.findByRole('button', { name: 'Apply hint' }))
  fireEvent.click(screen.getByRole('link', { name: 'Find waiver upgrades' }))
  vi.mocked(getLineupRoster).mockResolvedValue({ ...roster, bench: [] })
  fireEvent.click(await screen.findByRole('link', { name: 'Back to lineup · Week 7' }))
  expect(await screen.findByText(/Some staged swaps were removed/)).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Submit lineup changes' }) as HTMLButtonElement).disabled).toBe(true)
})

it('does not restore drafts from another team', async () => {
  sessionStorage.setItem('fantasy.lineup-draft:123:9:2026', JSON.stringify([{ id: '1', dropId: 'Starter', addId: 'Backup', slot: 'RB' }]))
  start()
  await screen.findByRole('button', { name: 'Apply hint' })
  expect(screen.queryByText('Starter → bench, Backup → RB')).toBeNull()
})

it('removing a staged swap persists across navigation', async () => {
  start()
  fireEvent.click(await screen.findByRole('button', { name: 'Apply hint' }))
  fireEvent.click(screen.getByRole('button', { name: '✕' }))
  fireEvent.click(screen.getByRole('link', { name: 'Evaluate trade' }))
  fireEvent.click(screen.getByRole('link', { name: 'Back to lineup · Week 7' }))
  await screen.findByRole('button', { name: 'Apply hint' })
  expect(screen.queryByText('Starter → bench, Backup → RB')).toBeNull()
})

it('omits invalid week context from trade links and follows edits', () => {
  start('/trades?week=invalid')
  expect(screen.getByRole('link', { name: 'Back to lineup' }).getAttribute('href')).toBe('/lineup')
  fireEvent.change(screen.getByRole('combobox', { name: 'Week' }), { target: { value: '9' } })
  expect(screen.getByRole('link', { name: 'Find waiver upgrades' }).getAttribute('href')).toBe(
    '/waivers?week=9',
  )
})

it('retains the idempotency key when retrying an uncertain submission', async () => {
  vi.mocked(triggerLineupSwap).mockRejectedValueOnce(new Error('Queue unavailable'))
  start('/lineup?week=5')
  fireEvent.click(await screen.findByRole('button', { name: 'Apply hint' }))
  fireEvent.click(screen.getByRole('button', { name: 'Submit lineup changes' }))
  await screen.findByText(/Failed to submit lineup swaps/)
  expect(screen.getByText('Starter → bench, Backup → RB')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Submit lineup changes' }))
  await waitFor(() => expect(triggerLineupSwap).toHaveBeenCalledTimes(2))
  expect(vi.mocked(triggerLineupSwap).mock.calls[0][2]).toBe(vi.mocked(triggerLineupSwap).mock.calls[1][2])
})

it('rejects a submission if the live week rolled over after staging', async () => {
  start('/lineup?week=5')
  fireEvent.click(await screen.findByRole('button', {name: 'Apply hint'}))
  vi.mocked(getCurrentWeek).mockResolvedValue({week: 6})
  fireEvent.click(screen.getByRole('button', {name: 'Submit lineup changes'}))
  await screen.findByText(/Lineup changes can only be submitted for the current week/)
  expect(triggerLineupSwap).not.toHaveBeenCalled()
})
