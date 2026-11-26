import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { useLocation } from 'react-router-dom'
import { getMatchup, getMatchupFeed, getPlayerSummary, getRecentNews } from '../api/client'
import { queryClient } from '../api/queryClient'
import { CONFIG_STORAGE_KEY } from '../hooks/useDraftConfig'
import { playerSummaryLive } from '../stories/fixtures'
import { renderForTest } from './jobs/renderForTest'
import { liveFeedFixture, liveMatchupFixture } from './matchup/liveFixtures'
import { MatchupPage } from './MatchupPage'

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  getMatchup: vi.fn(),
  getMatchupFeed: vi.fn(),
  getPlayerSummary: vi.fn(),
  getRecentNews: vi.fn(),
  getCurrentWeek: vi.fn().mockResolvedValue({ week: 7 }),
}))

beforeEach(() => {
  window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({ league_id: '123', team_id: '7', season: 2026, mode: 'live' }))
  const matchup = liveMatchupFixture('sunday')
  matchup.our_team.starters[0].live!.event_id = 'evt-1'
  vi.mocked(getMatchup).mockResolvedValue(matchup)
  vi.mocked(getMatchupFeed).mockResolvedValue(liveFeedFixture('sunday'))
  vi.mocked(getPlayerSummary).mockResolvedValue(playerSummaryLive)
  vi.mocked(getRecentNews).mockImplementation(async (ids) => ({
    has_news_24h: Object.fromEntries(ids.map((id) => [id, id === 'core-a1' || id === 'core-c1'])),
  }))
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  queryClient.clear()
  window.localStorage.clear()
})

function Location() {
  const { pathname, search } = useLocation()
  return <output data-testid="location">{pathname + search}</output>
}

const open = () => renderForTest(<><MatchupPage /><Location /></>, '/matchup?week=7')
const location = () => screen.getByTestId('location').textContent

async function openPopover() {
  open()
  fireEvent.click((await screen.findAllByRole('button', { name: 'Sample Runner A' }))[0])
}

it('links a game tile to its details for the selected week', async () => {
  open()
  fireEvent.click(await screen.findByRole('link', { name: /Game details →/ }))
  expect(location()).toBe('/matchup/game/evt-1?week=7')
})

// The popover's game is the one core is polling now, whatever week the page shows.
it('opens the popover\'s game in the current week', async () => {
  await openPopover()
  fireEvent.click(await screen.findByRole('button', { name: 'Open game details →' }))
  expect(location()).toBe(`/matchup/game/${playerSummaryLive.live!.event_id}`)
})

/** A player's table row and phone card; both are in the DOM, and CSS shows one of them. */
async function playerSurfaces(name: string) {
  const card = within(await screen.findByRole('region', { name: 'Your team: Gridiron Gang' }))
  const names = card.getAllByRole('button', { name })
  return {
    names,
    row: names.map((n) => n.closest('tr')).find(Boolean)!,
    phone: names.map((n) => n.closest<HTMLElement>('.matchup-mobile-player')).find(Boolean)!,
  }
}

it.each(['row', 'phone'] as const)('opens the popover from a click on the player %s', async (surface) => {
  open()
  const surfaces = await playerSurfaces('Sample Runner A')
  fireEvent.click(within(surfaces[surface]).getByText('Q3 8:42'))
  expect(await screen.findByRole('tab', { name: 'Stats' })).toBeTruthy()
  expect(getPlayerSummary).toHaveBeenCalledWith('core-a2')
})

it('gives each team-card player a name button for the keyboard', async () => {
  open()
  const { names } = await playerSurfaces('Sample Runner A')
  expect(names).toHaveLength(2)
  fireEvent.click(names[0])
  expect(await screen.findByRole('dialog')).toBeTruthy()
  expect(getPlayerSummary).toHaveBeenCalledWith('core-a2')
})

it('badges recent news on both teams, in the table and the phone card', async () => {
  open()
  const ours = await playerSurfaces('Sample Quarterback')
  expect(await within(ours.row).findByText('News')).toBeTruthy()
  expect(within(ours.phone).getByText('News')).toBeTruthy()
  const theirs = within(screen.getByRole('region', { name: 'Opponent: Waiver Wolves' }))
  expect(await theirs.findAllByText('News')).toHaveLength(2)
  expect(within((await playerSurfaces('Sample Runner A')).row).queryByText('News')).toBeNull()
})

it('shows no badge and no error when the news read fails', async () => {
  vi.mocked(getRecentNews).mockRejectedValue(new Error('news down'))
  open()
  await playerSurfaces('Sample Quarterback')
  await waitFor(() => expect(getRecentNews).toHaveBeenCalled())
  expect(screen.queryByText('News', { selector: '.mantine-Badge-label' })).toBeNull()
  expect(screen.queryByText(/news down/)).toBeNull()
})
