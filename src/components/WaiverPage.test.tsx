import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter } from 'react-router-dom'
import { WaiverPage } from './WaiverPage'
import { ApiError, getRosterDeficits, getWaiverFreeAgents, getWaiverRecommendations } from '../api/client'
import { CONFIG_STORAGE_KEY } from '../hooks/useDraftConfig'
import type { RosterDeficitsResponse, WaiverRecommendationsResponse } from '../api/types'

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>()
  return {
    ApiError: actual.ApiError,
    getRosterDeficits: vi.fn(),
    getWaiverRecommendations: vi.fn(),
    getWaiverFreeAgents: vi.fn(),
    getCurrentWeek: vi.fn().mockResolvedValue({ week: 5 }),
    triggerWaiverClaim: vi.fn(),
  }
})

// The grid fetches team names itself; the page only decides whether to render it.
vi.mock('./RosterDeficitsGrid', () => ({
  RosterDeficitsGrid: ({ deficits, loading }: { deficits: unknown; loading: boolean }) => (
    <div data-testid="deficits-grid">{loading ? 'loading' : deficits ? 'deficits loaded' : 'empty'}</div>
  ),
}))

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    matches: false, addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  })),
})

const deficits = { season: 2026, week: 5, teams: [] } as unknown as RosterDeficitsResponse
const recommendations: WaiverRecommendationsResponse = {
  season: 2026, week: 5,
  recommendations: [{
    position: 'RB', vorp_delta: 8,
    free_agent: { espn_id: '4046', name: 'Some Back', pro_team: 'KC', injury_status: null, net_vorp: 9 },
    bench_player: { espn_id: '9999', name: 'Bench Back', pro_team: 'NO', injury_status: null, net_vorp: 1 },
    rumor_sentiment: null, rumor_confidence: null, rumor_suggested_action: null,
  }],
}

beforeEach(() => {
  window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({ league_id: '123', team_id: '8', season: 2026, mode: 'live' }))
})

afterEach(() => { cleanup(); vi.clearAllMocks(); window.localStorage.clear() })

function renderPage() {
  render(
    <MantineProvider>
      <MemoryRouter initialEntries={['/waivers?week=5']}>
        <WaiverPage />
      </MemoryRouter>
    </MantineProvider>,
  )
}

it('keeps roster deficits visible when recommendations are unavailable', async () => {
  vi.mocked(getRosterDeficits).mockResolvedValue(deficits)
  vi.mocked(getWaiverRecommendations).mockRejectedValue(
    new ApiError(503, 'Waiver recommendations unavailable: stale weekly_stats.vorp_score'),
  )

  renderPage()

  expect(await screen.findByText('deficits loaded')).toBeTruthy()
  expect(await screen.findByText(/Waiver recommendations unavailable: stale weekly_stats.vorp_score/)).toBeTruthy()
  // A failed load must not read as "nothing worth claiming".
  expect(screen.queryByText('No waiver upgrades this week.')).toBeNull()
})

it('keeps recommendations visible when roster deficits fail', async () => {
  vi.mocked(getRosterDeficits).mockRejectedValue(new ApiError(500, 'Failed to compute roster deficits: boom'))
  vi.mocked(getWaiverRecommendations).mockResolvedValue(recommendations)

  renderPage()

  expect(await screen.findByText(/Some Back/)).toBeTruthy()
  expect(await screen.findByText(/Failed to compute roster deficits: boom/)).toBeTruthy()
  expect(screen.queryByTestId('deficits-grid')).toBeNull()
})

it('shows both sections and no errors when both calls succeed', async () => {
  vi.mocked(getRosterDeficits).mockResolvedValue(deficits)
  vi.mocked(getWaiverRecommendations).mockResolvedValue(recommendations)

  renderPage()

  expect(await screen.findByText('deficits loaded')).toBeTruthy()
  expect(await screen.findByText(/Some Back/)).toBeTruthy()
  // RoadmapBanner is itself an Alert, so check for error text rather than any alert.
  await waitFor(() => expect(screen.queryByText(/unavailable|Failed to/i)).toBeNull())
  expect(getRosterDeficits).toHaveBeenCalledWith(2026, 5)
  expect(getWaiverRecommendations).toHaveBeenCalledWith(2026, 5)
})

it('renders standalone IR moves and open slots even without waiver upgrades', async () => {
  vi.mocked(getRosterDeficits).mockResolvedValue(deficits)
  vi.mocked(getWaiverRecommendations).mockResolvedValue({
    season: 2026, week: 5, recommendations: [], open_ir_slots: 1,
    ir_moves: [{ action: 'move_to_ir', position: 'WR', player: {
      espn_id: '456', name: 'Injured Receiver', pro_team: 'KC', injury_status: 'OUT', net_vorp: 4,
    } }],
  })
  renderPage()
  expect(await screen.findByText('Injured Receiver')).toBeTruthy()
  expect(screen.getByText('1 open IR slot')).toBeTruthy()
  expect(screen.getByText('Move to IR')).toBeTruthy()
  expect(screen.getByText(/Make IR moves directly in ESPN/)).toBeTruthy()
  expect(screen.queryByRole('link', { name: 'Review move' })).toBeNull()
})

it('fetches the free-agent pool only once Browse free agents is opened', async () => {
  vi.mocked(getRosterDeficits).mockResolvedValue(deficits)
  vi.mocked(getWaiverRecommendations).mockResolvedValue({ ...recommendations, open_roster_slots: 1 })
  vi.mocked(getWaiverFreeAgents).mockResolvedValue({
    season: 2026, week: 5, total: 1, limit: 25, offset: 0, free_agents: [{
      player_id: 'p2', espn_id: '5050', name: 'Pool Receiver', position: 'WR', pro_team: 'BUF',
      injury_status: null, projected_points: 8, vorp_score: 3,
    }],
  })
  renderPage()
  expect(await screen.findByText('1 open roster slot')).toBeTruthy()
  expect(getWaiverFreeAgents).not.toHaveBeenCalled()

  const details = screen.getByText('Browse free agents').closest('details')!
  details.open = true
  fireEvent(details, new Event('toggle'))

  expect(await screen.findByText('Pool Receiver')).toBeTruthy()
  expect(getWaiverFreeAgents).toHaveBeenCalledWith(expect.objectContaining({ season: 2026, week: 5 }))
  expect(screen.getByRole('link', { name: 'Add to open slot' })).toBeTruthy()
})
