import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LineupPage } from './LineupPage'
import { getCurrentWeek, getLineupRoster } from '../api/client'
import { queryClient } from '../api/queryClient'
import { CONFIG_STORAGE_KEY } from '../hooks/useDraftConfig'
import type { LineupPlayerLine, LineupRosterResponse } from '../api/types'

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  getLineupRoster: vi.fn(), triggerLineupSwap: vi.fn(), getCurrentWeek: vi.fn(),
  getRosterDeficits: vi.fn().mockResolvedValue({ teams: {} }),
  getMatchup: vi.fn().mockRejectedValue(new Error('No matchup')),
}))
vi.mock('./RosterDeficitsGrid', () => ({ RosterDeficitsGrid: () => <div>Roster deficits</div> }))
Object.defineProperty(window, 'matchMedia', {
  writable: true, value: vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })),
})

const player = (id: string, slot: string, overrides: Partial<LineupPlayerLine> = {}): LineupPlayerLine => ({
  player_id: id, espn_id: `espn-${id}`, name: id, position: 'RB', slot, pro_team: 'KC',
  jersey: null, injury_status: null, headshot_url: '', deficit_flag: false,
  suggested_swap: null, net_vorp: 5, rumor_sentiment: null, rumor_confidence: null, rumor_suggested_action: null,
  ...overrides,
})
const healed = player('Healed', 'IR', { ir_suggestion: { action: 'activate_from_ir', reason: 'Active again.' } })
const roster = (counts?: Record<string, number> | null): LineupRosterResponse => ({
  starters: [player('Starter', 'RB')], bench: [player('Backup', 'BE'), healed], lineup_slot_counts: counts,
})

beforeEach(() => {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({ league_id: '123', team_id: '8', season: 2026, mode: 'live' }))
  vi.mocked(getCurrentWeek).mockResolvedValue({ week: 5 })
})
afterEach(() => { cleanup(); vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); queryClient.clear() })

function start() {
  return render(<MantineProvider><MemoryRouter initialEntries={['/lineup?week=5']}><Routes>
    <Route path="/lineup" element={<LineupPage />} />
  </Routes></MemoryRouter></MantineProvider>)
}
const section = (name: string) => screen.getByRole('region', { name })

it('shows IR players in their own section with bench and IR capacity', async () => {
  vi.mocked(getLineupRoster).mockResolvedValue(roster({ BE: 2, IR: 1 }))
  start()
  expect(await screen.findByRole('heading', { name: 'Bench 1/2' })).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'IR 1/1' })).toBeTruthy()
  const bench = section('Bench 1/2')
  expect(within(bench).getByText('Backup')).toBeTruthy()
  expect(within(bench).queryByText('Healed')).toBeNull()
  const ir = section('IR 1/1')
  expect(within(ir).getAllByText('Healed').length).toBeGreaterThan(0)
  expect(within(ir).getByRole('button', { name: 'Activate Healed from IR' })).toBeTruthy()
})

it('links an open bench spot to the free-agent browser', async () => {
  vi.mocked(getLineupRoster).mockResolvedValue(roster({ BE: 3, IR: 2 }))
  start()
  const bench = await screen.findByRole('region', { name: 'Bench 1/3' })
  const links = within(bench).getAllByRole('link', { name: /Open bench spot/ })
  expect(links).toHaveLength(2)
  expect(links[0].getAttribute('href')).toBe('/waivers?week=5#free-agents')
  expect(within(section('IR 1/2')).getByText('Open IR spot')).toBeTruthy()
})

it('shows plain headings and no open spots when slot counts are unknown', async () => {
  vi.mocked(getLineupRoster).mockResolvedValue(roster(null))
  start()
  expect(await screen.findByRole('heading', { name: 'Bench' })).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'IR' })).toBeTruthy()
  expect(screen.queryByRole('link', { name: /Open bench spot/ })).toBeNull()
  expect(screen.queryByText('Open IR spot')).toBeNull()
})

it('hides the IR section when the league has no IR slots and nobody is in IR', async () => {
  vi.mocked(getLineupRoster).mockResolvedValue({
    starters: [player('Starter', 'RB')], bench: [player('Backup', 'BE')], lineup_slot_counts: { BE: 1 },
  })
  start()
  expect(await screen.findByRole('heading', { name: 'Bench 1/1' })).toBeTruthy()
  expect(screen.queryByRole('heading', { name: /^IR/ })).toBeNull()
})

it('drops a restored swap that would start an IR player', async () => {
  vi.mocked(getLineupRoster).mockResolvedValue(roster({ BE: 2, IR: 1 }))
  sessionStorage.setItem('fantasy.lineup-draft:123:8:2026:5', JSON.stringify([
    { id: 'swap-1', dropId: 'Starter', addId: 'Healed', slot: 'RB' },
  ]))
  start()
  expect(await screen.findByText(/Some staged swaps were removed/)).toBeTruthy()
})
