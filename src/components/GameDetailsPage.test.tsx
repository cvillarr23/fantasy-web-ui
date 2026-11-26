import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { ApiError, getMatchupGame, getPlayerSummary } from '../api/client'
import { CONFIG_STORAGE_KEY } from '../hooks/useDraftConfig'
import { playerSummaryLive } from '../stories/fixtures'
import { gameFixture } from './game/fixtures'
import { GameDetailsPage } from './GameDetailsPage'
import { renderForTest } from './jobs/renderForTest'

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  getMatchupGame: vi.fn(),
  getPlayerSummary: vi.fn(),
  getCurrentWeek: vi.fn().mockResolvedValue({ week: 7 }),
}))

beforeEach(() => {
  window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({ league_id: '123', team_id: '7', season: 2026, mode: 'live' }))
  vi.mocked(getMatchupGame).mockResolvedValue(gameFixture('live'))
  vi.mocked(getPlayerSummary).mockResolvedValue(playerSummaryLive)
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  window.localStorage.clear()
})

function Location() {
  const { pathname, search } = useLocation()
  return <output data-testid="location">{pathname + search}</output>
}

function open(route = '/matchup/game/evt-1?week=7') {
  return renderForTest(
    <>
      <Routes>
        <Route path="matchup/game/:eventId" element={<GameDetailsPage />} />
        <Route path="*" element={null} />
      </Routes>
      <Location />
    </>,
    route,
  )
}

const split = () => screen.findByRole('region', { name: 'Fantasy points from this game' })
const rowToggle = (name: string) => screen.findByRole('button', { name: new RegExp(name), expanded: false })

it('asks for this game in the selected week', async () => {
  open()
  await split()
  expect(getMatchupGame).toHaveBeenCalledWith('evt-1', 2026, 7)
})

it('follows the current week when the URL has none', async () => {
  open('/matchup/game/evt-1')
  await split()
  expect(getMatchupGame).toHaveBeenCalledWith('evt-1', 2026, 7)
})

it('shows the score, status, clock and ball', async () => {
  open()
  const header = within(await screen.findByRole('region', { name: 'Score' }))
  expect(header.getByText('TB')).toBeTruthy()
  expect(header.getByText('14')).toBeTruthy()
  expect(header.getByText('ATL')).toBeTruthy()
  expect(header.getByText('17')).toBeTruthy()
  expect(header.getByText('Live')).toBeTruthy()
  expect(header.getByText('Q3 8:42')).toBeTruthy()
  expect(header.getByText('ATL ball · TB 12')).toBeTruthy()
})

it('shows each side\'s total, which leaves out the bench', async () => {
  open()
  const totals = within(await split())
  expect(totals.getByText('Your fantasy points from this game').nextElementSibling?.textContent).toBe('18.6')
  expect(totals.getByText("Opponent's fantasy points from this game").nextElementSibling?.textContent).toBe('6.2')
})

it('sizes the hidden bar in proportion to the two totals', async () => {
  open()
  const bar = (await split()).querySelector('[aria-hidden="true"]') as HTMLElement
  const [mine, theirs] = Array.from(bar.children) as HTMLElement[]
  expect(mine.style.width).toBe('75%')
  expect(theirs.style.width).toBe('25%')
})

it('lists each player with side, stat line, actual and projected', async () => {
  open()
  const row = within(await rowToggle('Sample Runner A'))
  expect(row.getByText('You')).toBeTruthy()
  expect(row.getByText('RB · ATL · 96 rush yds 1 TD · 2 rec 10 yds')).toBeTruthy()
  expect(row.getByText('18.6')).toBeTruthy()
  expect(row.getByText('Proj 14.8')).toBeTruthy()
  expect(within(await rowToggle('Rival Receiver A')).getByText('Opp')).toBeTruthy()
  expect(within(await rowToggle('Sample Receiver D')).getByText('Bench')).toBeTruthy()
})

it('expands a row into its breakdown and collapses it again', async () => {
  open()
  const toggle = await rowToggle('Sample Runner A')
  expect(screen.queryByRole('table')).toBeNull()
  fireEvent.click(toggle)
  expect(toggle.getAttribute('aria-expanded')).toBe('true')
  const table = within(screen.getByRole('table', { name: "This week's scoring breakdown" }))
  expect(table.getByText('1 pt per 10 rushing yds')).toBeTruthy()
  expect(table.getByText('Total').closest('tr')?.textContent).toContain('18.6')
  fireEvent.click(toggle)
  expect(toggle.getAttribute('aria-expanded')).toBe('false')
  expect(screen.queryByRole('table')).toBeNull()
})

it('keeps other rows open when another is expanded', async () => {
  open()
  fireEvent.click(await rowToggle('Sample Runner A'))
  fireEvent.click(await rowToggle('Rival Receiver A'))
  expect(screen.getAllByRole('table')).toHaveLength(2)
})

it('links an expanded row to the scoring guide for the same week', async () => {
  open()
  fireEvent.click(await rowToggle('Sample Runner A'))
  fireEvent.click(screen.getByRole('link', { name: 'See all rules' }))
  expect(screen.getByTestId('location').textContent).toBe('/scoring?week=7')
})

it('opens the scoring guide from the popover, closing it', async () => {
  open()
  fireEvent.click(await rowToggle('Sample Runner A'))
  fireEvent.click(screen.getByRole('button', { name: 'Player card' }))
  fireEvent.click(await screen.findByRole('tab', { name: 'Stats' }))
  fireEvent.click(await screen.findByRole('button', { name: 'How is this scored?' }))
  expect(screen.getByTestId('location').textContent).toBe('/scoring?week=7')
  await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
})

it('opens the player popover from an expanded row', async () => {
  open()
  fireEvent.click(await rowToggle('Sample Runner A'))
  fireEvent.click(screen.getByRole('button', { name: 'Player card' }))
  expect(await screen.findByRole('dialog')).toBeTruthy()
  expect(getPlayerSummary).toHaveBeenCalledWith('p1')
})

it('goes to the popover\'s game, closing the popover', async () => {
  open()
  fireEvent.click(await rowToggle('Sample Runner A'))
  fireEvent.click(screen.getByRole('button', { name: 'Player card' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Open game details →' }))
  expect(screen.getByTestId('location').textContent).toBe(`/matchup/game/${playerSummaryLive.live!.event_id}`)
  await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
})

it('lists the game\'s plays without repeating the game label', async () => {
  open()
  const plays = within(await screen.findByRole('region', { name: 'Fantasy-relevant plays' }))
  expect(plays.getAllByRole('listitem')).toHaveLength(3)
  expect(plays.getByText('12-yd run to TB 12')).toBeTruthy()
  expect(plays.queryByText('TB 14 – 17 ATL')).toBeNull()
})

it('shows a game that has not kicked off without scores, points or plays', async () => {
  vi.mocked(getMatchupGame).mockResolvedValue(gameFixture('preGame'))
  open()
  const header = within(await screen.findByRole('region', { name: 'Score' }))
  expect(header.getByText('Upcoming')).toBeTruthy()
  expect(header.getAllByText('—')).toHaveLength(2)
  expect(within(await split()).getAllByText('—')).toHaveLength(2)
  expect(screen.getByText("No plays yet. The game hasn't kicked off.")).toBeTruthy()
  fireEvent.click(await rowToggle('Sample Runner A'))
  expect(screen.getByText("No stats yet. This game hasn't started.")).toBeTruthy()
})

it('says a breakdown is unavailable for a started game that has none', async () => {
  const detail = gameFixture('live')
  detail.players[0].breakdown = null
  vi.mocked(getMatchupGame).mockResolvedValue(detail)
  open()
  fireEvent.click(await rowToggle('Sample Runner A'))
  expect(screen.getByText('No scoring breakdown for this player.')).toBeTruthy()
})

it('says there is no live data on a 404, with the way back', async () => {
  vi.mocked(getMatchupGame).mockRejectedValue(new ApiError(404, 'No live snapshot'))
  open()
  expect(await screen.findByText('No live data for this game this week.')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull()
  expect(screen.getByRole('link', { name: '← Matchup' }).getAttribute('href')).toBe('/matchup?week=7')
})

it('offers a retry when the read fails', async () => {
  vi.mocked(getMatchupGame).mockRejectedValue(new ApiError(503, 'The live snapshot is unavailable'))
  open()
  expect(await screen.findByText(/The live snapshot is unavailable/)).toBeTruthy()
  vi.mocked(getMatchupGame).mockResolvedValue(gameFixture('live'))
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  expect(await split()).toBeTruthy()
})
