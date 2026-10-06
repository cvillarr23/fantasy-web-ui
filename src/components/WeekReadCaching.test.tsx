import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { MatchupPage } from './MatchupPage'
import { ScoreboardPage } from './ScoreboardPage'
import { LineupPage } from './LineupPage'
import { WaiverPage } from './WaiverPage'
import {
  ApiError,
  getLineupRoster,
  getMatchup,
  getRosterDeficits,
  getScoreboard,
} from '../api/client'
import { CONFIG_STORAGE_KEY } from '../hooks/useDraftConfig'
import type { LineupPlayerLine, MatchupResponse, ScoreboardResponse } from '../api/types'

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>()
  return {
    ApiError: actual.ApiError,
    getCurrentWeek: vi.fn().mockResolvedValue({ week: 5 }),
    getMatchup: vi.fn(),
    getScoreboard: vi.fn(),
    getLineupRoster: vi.fn(),
    getRosterDeficits: vi.fn().mockResolvedValue({ teams: {} }),
    getWaiverRecommendations: vi.fn().mockResolvedValue({ recommendations: [] }),
    getTeamNames: vi.fn().mockResolvedValue({}),
    triggerLineupSwap: vi.fn(),
  }
})
vi.mock('./RosterDeficitsGrid', () => ({ RosterDeficitsGrid: () => <div>Roster deficits</div> }))
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn(() => ({
    matches: false, addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  })),
})

const side = (name: string) => ({
  team: { name, logo_url: '', score: 90, projected: 100 }, starters: [], bench: [],
})
const matchup: MatchupResponse = { season: 2026, week: 5, our_team: side('Ours'), opponent: side('Rivals') }
const scoreboard: ScoreboardResponse = {
  season: 2026, week: 5,
  matchups: [{
    home: { team_id: '8', name: 'Ours', logo_url: '', score: 90, projected: 100 },
    away: { team_id: '9', name: 'Rivals', logo_url: '', score: 80, projected: 95 },
  }],
}
const player = (id: string, slot: string): LineupPlayerLine => ({
  player_id: id, espn_id: `espn-${id}`, name: id, position: 'RB', slot, pro_team: 'KC',
  jersey: null, injury_status: null, headshot_url: '', deficit_flag: false,
  suggested_swap: null, net_vorp: 5, rumor_sentiment: null, rumor_confidence: null, rumor_suggested_action: null,
})

beforeEach(() => {
  localStorage.setItem(
    CONFIG_STORAGE_KEY,
    JSON.stringify({ league_id: '123', team_id: '8', season: 2026, mode: 'live' }),
  )
  vi.mocked(getMatchup).mockResolvedValue(matchup)
  vi.mocked(getScoreboard).mockResolvedValue(scoreboard)
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
})

function start(url: string) {
  return render(
    <MantineProvider>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/matchup" element={<MatchupPage />} />
          <Route path="/scoreboard" element={<ScoreboardPage />} />
          <Route path="/lineup" element={<LineupPage />} />
          <Route path="/waivers" element={<WaiverPage />} />
        </Routes>
      </MemoryRouter>
    </MantineProvider>,
  )
}

it('revisiting the matchup page renders cached data without a request', async () => {
  start('/matchup?week=5')
  expect(await screen.findByText('Rivals')).toBeTruthy()
  cleanup()

  start('/matchup?week=5')
  expect(screen.getByText('Rivals')).toBeTruthy()
  expect(screen.queryByRole('status', { name: 'Loading matchup' })).toBeNull()
  expect(getMatchup).toHaveBeenCalledTimes(1)
})

it('caches a bye week instead of retrying it as an error', async () => {
  vi.mocked(getMatchup).mockRejectedValue(new ApiError(404, 'No matchup'))
  start('/matchup?week=5')
  expect(await screen.findByText(/No matchup found for this week/)).toBeTruthy()
  cleanup()

  start('/matchup?week=5')
  expect(screen.getByText(/No matchup found for this week/)).toBeTruthy()
  expect(getMatchup).toHaveBeenCalledTimes(1)
})

it('revisiting the scoreboard renders cached data without a request', async () => {
  start('/scoreboard?week=5')
  expect(await screen.findAllByText('Rivals')).not.toHaveLength(0)
  cleanup()

  start('/scoreboard?week=5')
  expect(screen.getAllByText('Rivals')).not.toHaveLength(0)
  expect(screen.queryByRole('status', { name: 'Loading scoreboard' })).toBeNull()
  expect(getScoreboard).toHaveBeenCalledTimes(1)
})

it('lineup and waivers share one roster-deficits read for the same week', async () => {
  vi.mocked(getLineupRoster).mockResolvedValue({ starters: [player('Starter', 'RB')], bench: [] })
  start('/lineup?week=5')
  await screen.findByText('Roster deficits')
  cleanup()

  start('/waivers?week=5')
  await screen.findByText('Roster deficits')
  expect(getRosterDeficits).toHaveBeenCalledTimes(1)
})

it('switching weeks never prunes the other week\'s staged swaps against the wrong roster', async () => {
  // Week 6's swap is valid only against week 6's roster.
  const week6Key = 'fantasy.lineup-draft:123:8:2026:6'
  const saved = JSON.stringify([{ id: 'w6', dropId: 'Six', addId: 'SixBench', slot: 'RB' }])
  sessionStorage.setItem(week6Key, saved)
  let resolveWeek6: (value: { starters: LineupPlayerLine[]; bench: LineupPlayerLine[] }) => void = () => {}
  vi.mocked(getLineupRoster).mockImplementation((_season, week) =>
    week === 6
      ? new Promise((resolve) => { resolveWeek6 = resolve })
      : Promise.resolve({ starters: [player('Five', 'RB')], bench: [player('FiveBench', 'BE')] }),
  )

  start('/lineup?week=5')
  await screen.findByRole('button', { name: 'Next week' })
  await waitFor(() => expect(getLineupRoster).toHaveBeenCalledWith(2026, 5))
  fireEvent.click(screen.getByRole('button', { name: 'Next week' }))
  await waitFor(() => expect(getLineupRoster).toHaveBeenCalledWith(2026, 6))

  // While week 6 loads, week 5's roster stays on screen as a placeholder.
  expect(sessionStorage.getItem(week6Key)).toBe(saved)
  resolveWeek6({ starters: [player('Six', 'RB')], bench: [player('SixBench', 'BE')] })
  expect(await screen.findByText('Six → bench, SixBench → RB')).toBeTruthy()
  expect(screen.queryByText(/Some staged swaps were removed/)).toBeNull()
})
