import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LineupPage } from './LineupPage'
import {
  getByeOutlook, getCurrentWeek, getLineupRoster, getRosterDeficits, getTradeCandidates, getWaiverRecommendations,
} from '../api/client'
import { queryClient } from '../api/queryClient'
import { CONFIG_STORAGE_KEY } from '../hooks/useDraftConfig'
import {
  lineupByeOutlook, lineupDeficits, lineupRoster, lineupTradeCandidates, lineupWaivers,
} from './lineupFixtures'

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  getLineupRoster: vi.fn(), getCurrentWeek: vi.fn(), getRosterDeficits: vi.fn(), getByeOutlook: vi.fn(),
  getWaiverRecommendations: vi.fn(), getTradeCandidates: vi.fn(), getTeamNames: vi.fn().mockResolvedValue({}),
  getMatchup: vi.fn().mockRejectedValue(new Error('No matchup')),
}))
Object.defineProperty(window, 'matchMedia', {
  writable: true, value: vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })),
})

beforeEach(() => {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({ league_id: '123', team_id: '7', season: 2026, mode: 'live' }))
  vi.mocked(getCurrentWeek).mockResolvedValue({ week: 9 })
  vi.mocked(getLineupRoster).mockResolvedValue(lineupRoster)
  vi.mocked(getRosterDeficits).mockResolvedValue(lineupDeficits)
  vi.mocked(getByeOutlook).mockResolvedValue(lineupByeOutlook)
  vi.mocked(getWaiverRecommendations).mockResolvedValue(lineupWaivers)
  vi.mocked(getTradeCandidates).mockResolvedValue({ items: lineupTradeCandidates } as never)
})
afterEach(() => { cleanup(); vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); queryClient.clear() })

function start() {
  return render(<MantineProvider><MemoryRouter initialEntries={['/lineup?week=9']}><Routes>
    <Route path="/lineup" element={<LineupPage />} />
  </Routes></MemoryRouter></MantineProvider>)
}

it('puts the lineup you act on before the league deficits, which start collapsed', async () => {
  start()
  const lineup = await screen.findByRole('heading', { name: 'Set your lineup' })
  const deficits = screen.getByText('Roster deficits', { selector: 'summary' })
  expect(lineup.compareDocumentPosition(deficits) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect((deficits.closest('details') as HTMLDetailsElement).open).toBe(false)
  expect(screen.getByRole('heading', { level: 1, name: 'Lineup' })).toBeTruthy()
})

it('summarises the page in header pills from the same reads', async () => {
  start()
  expect(await screen.findByRole('link', { name: '1 suggested change' })).toBeTruthy()
  expect(screen.getByRole('link', { name: '1 injured starter' })).toBeTruthy()
  expect(await screen.findByRole('link', { name: 'Bye crunch: weeks 9' })).toBeTruthy()
  expect(await screen.findByRole('link', { name: '1 position short' })).toBeTruthy()
  expect(getLineupRoster).toHaveBeenCalledTimes(1)
})

it('opens the collapsed deficits panel when its pill is clicked', async () => {
  start()
  fireEvent.click(await screen.findByRole('link', { name: '1 position short' }))
  const panel = screen.getByText('Roster deficits', { selector: 'summary' }).closest('details') as HTMLDetailsElement
  expect(panel.open).toBe(true)
  expect(await screen.findByText('Your positions')).toBeTruthy()
})

it('shows the bye-crunch alert inside the lineup section with inline fixes', async () => {
  start()
  const alert = await screen.findByRole('alert', { name: 'Bye-week crunch ahead' })
  expect(alert.closest('#set-lineup')).toBeTruthy()
  expect(await screen.findByText('Sample Waiver Back')).toBeTruthy()
  expect(await screen.findByText('Gridiron Ghosts')).toBeTruthy()
})

it('still shows the lineup when the bye outlook, waivers and trades all fail', async () => {
  vi.mocked(getByeOutlook).mockRejectedValue(new Error('down'))
  start()
  expect(await screen.findByRole('heading', { name: 'Set your lineup' })).toBeTruthy()
  expect(await screen.findByText('Bye outlook unavailable')).toBeTruthy()
  expect(screen.queryByRole('alert', { name: 'Bye-week crunch ahead' })).toBeNull()
})
