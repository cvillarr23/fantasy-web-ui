import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter } from 'react-router-dom'
import { FreeAgentBrowser } from './FreeAgentBrowser'
import { ApiError, getWaiverFreeAgents } from '../api/client'
import { queryClient } from '../api/queryClient'
import type { DraftConfig, FreeAgentEntry, FreeAgentsResponse } from '../api/types'

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>()
  return { ApiError: actual.ApiError, getWaiverFreeAgents: vi.fn() }
})

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    matches: false, addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  })),
})

const config: DraftConfig = { league_id: '123', team_id: '8', season: 2026, mode: 'live' }
const bench = {
  player_id: 'p9', espn_id: '9999', name: 'Bench Back', position: 'RB', pro_team: 'NO',
  injury_status: null, projected_points: 4, vorp_score: 1,
}
const agent: FreeAgentEntry = {
  player_id: 'p1', espn_id: '4046', name: 'Some Back', position: 'RB', pro_team: 'KC',
  injury_status: 'QUESTIONABLE', projected_points: 12.4, vorp_score: 9, bench_player: bench, vorp_delta: 8,
}
function response(overrides: Partial<FreeAgentsResponse> = {}): FreeAgentsResponse {
  return {
    season: 2026, week: 5, free_agents: [agent], total: 1, limit: 25, offset: 0,
    source_mode: 'target_week', source_weeks: [5], ...overrides,
  }
}

beforeEach(() => queryClient.clear())
afterEach(() => { cleanup(); vi.clearAllMocks() })

function renderBrowser(openRosterSlots = 0) {
  render(
    <MantineProvider>
      <MemoryRouter>
        <FreeAgentBrowser config={config} week={5} openRosterSlots={openRosterSlots} />
      </MemoryRouter>
    </MantineProvider>,
  )
}

it('lists free agents with injury status, metrics and the suggested drop', async () => {
  vi.mocked(getWaiverFreeAgents).mockResolvedValue(response())
  renderBrowser()
  const row = (await screen.findByText('Some Back')).closest('tr')!
  expect(within(row).getByText('RB · KC')).toBeTruthy()
  expect(within(row).getByText('Q')).toBeTruthy()
  expect(within(row).getByText('12.4')).toBeTruthy()
  expect(within(row).getByText('Bench Back')).toBeTruthy()
  expect(within(row).getByText('Swap +8.0 VORP')).toBeTruthy()
  expect(getWaiverFreeAgents).toHaveBeenCalledWith({
    season: 2026, week: 5, position: '', q: '', sort: 'vorp', limit: 25, offset: 0,
  })
})

it('claims with the suggested drop and hides add-only when the roster is full', async () => {
  vi.mocked(getWaiverFreeAgents).mockResolvedValue(response())
  renderBrowser(0)
  await screen.findByText('Some Back')
  expect(screen.queryByRole('link', { name: 'Add to open slot' })).toBeNull()
  expect(screen.getByRole('link', { name: 'Claim with drop' }).getAttribute('href'))
    .toBe('/moves/review?kind=waiver&week=5&add=4046&drop=9999')
})

it('offers an add-only claim when there is an open roster slot', async () => {
  vi.mocked(getWaiverFreeAgents).mockResolvedValue(response({ free_agents: [{ ...agent, bench_player: null, vorp_delta: null }] }))
  renderBrowser(1)
  await screen.findByText('Some Back')
  expect(screen.getByRole('link', { name: 'Add to open slot' }).getAttribute('href'))
    .toBe('/moves/review?kind=waiver&week=5&add=4046')
  // No suggested drop: the manager picks one on the review page.
  expect(screen.getByRole('link', { name: 'Claim with drop' }).getAttribute('href'))
    .toBe('/moves/review?kind=waiver&week=5&add=4046')
})

it('re-queries from the first page when sorting or paging changes', async () => {
  vi.mocked(getWaiverFreeAgents).mockResolvedValue(response({ total: 60 }))
  renderBrowser()
  await screen.findByText('1–1 of 60')
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  await waitFor(() => expect(getWaiverFreeAgents).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 25 })))
  fireEvent.click(screen.getByText('Projection'))
  await waitFor(() => expect(getWaiverFreeAgents).toHaveBeenLastCalledWith(
    expect.objectContaining({ sort: 'projected', offset: 0 }),
  ))
})

it('searches by name after the debounce', async () => {
  vi.mocked(getWaiverFreeAgents).mockResolvedValue(response())
  renderBrowser()
  await screen.findByText('Some Back')
  fireEvent.change(screen.getByLabelText('Search by name'), { target: { value: 'some' } })
  await waitFor(() => expect(getWaiverFreeAgents).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'some', offset: 0 })))
})

it('shows a load failure as an error, not an empty pool', async () => {
  vi.mocked(getWaiverFreeAgents).mockRejectedValue(new ApiError(503, 'Free agents unavailable: stale data'))
  renderBrowser()
  expect(await screen.findByText(/Free agents unavailable: stale data/)).toBeTruthy()
  expect(screen.queryByText('No free agents match.')).toBeNull()
})

it('notes when metrics come from prior weeks', async () => {
  vi.mocked(getWaiverFreeAgents).mockResolvedValue(response({ source_mode: 'rolling_prior_weeks', source_weeks: [3, 4] }))
  renderBrowser()
  expect(await screen.findByText(/prior-week averages \(weeks 3, 4\)/)).toBeTruthy()
})
