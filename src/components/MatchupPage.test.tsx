import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { useLocation } from 'react-router-dom'
import { getMatchup, getMatchupFeed, getPlayerSummary } from '../api/client'
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
  getCurrentWeek: vi.fn().mockResolvedValue({ week: 7 }),
}))

beforeEach(() => {
  window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({ league_id: '123', team_id: '7', season: 2026, mode: 'live' }))
  const matchup = liveMatchupFixture('sunday')
  matchup.our_team.starters[0].live!.event_id = 'evt-1'
  vi.mocked(getMatchup).mockResolvedValue(matchup)
  vi.mocked(getMatchupFeed).mockResolvedValue(liveFeedFixture('sunday'))
  vi.mocked(getPlayerSummary).mockResolvedValue(playerSummaryLive)
})
afterEach(() => {
  cleanup()
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
