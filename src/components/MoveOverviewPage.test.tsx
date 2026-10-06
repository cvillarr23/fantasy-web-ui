import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { Link, MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../api/queryClient'
import { previewMove } from '../api/dashboard'
import { triggerWaiverClaim } from '../api/client'
import { MoveOverviewPage } from './MoveOverviewPage'
vi.mock('../api/dashboard', () => ({ previewMove: vi.fn() }))
vi.mock('../api/client', () => ({ triggerWaiverClaim: vi.fn() }))
vi.mock('../hooks/useDraftConfig', () => ({
  useDraftConfig: () => ({ config: { league_id: '123', team_id: '8', season: 2026 } }),
}))
vi.mock('../hooks/useSelectedWeek', () => ({ useSelectedWeek: () => [5, vi.fn()] }))
vi.mock('@mantine/charts', () => ({ LineChart: () => null }))
const incoming = {
  espn_id: '1',
  name: 'Incoming player',
  position: 'RB',
  pro_team: 'KC',
  injury_status: null,
}
const snapshot = {
  before: [],
  after: [incoming],
  incoming: [incoming],
  outgoing: [],
  warnings: ['Fresh roster warning'],
  weeks: [],
  updated_at: '2026-10-05T12:00:00Z',
}
beforeEach(() => {
  vi.mocked(previewMove).mockReset().mockResolvedValue(snapshot)
  vi.mocked(triggerWaiverClaim)
    .mockReset()
    .mockResolvedValue({
      status: 'accepted',
      queue: 'waiver_actions',
      team_id: '8',
      tracking_id: 'tracked',
    })
  window.matchMedia = vi
    .fn()
    .mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
})
function start(url = '/moves/review?add=1') {
  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <MemoryRouter initialEntries={[url]}>
          <MoveOverviewPage />
          <Link to="/moves/review?add=2">Change selection</Link>
        </MemoryRouter>
      </MantineProvider>
    </QueryClientProvider>,
  )
}
it('refreshes before confirmation and submits an add-only claim with the displayed player', async () => {
  start()
  fireEvent.click(await screen.findByRole('button', { name: 'Review and submit ESPN claim' }))
  const dialog = await screen.findByRole('dialog')
  expect(within(dialog).getByText(/without dropping a player/)).toBeTruthy()
  expect(within(dialog).getByText('Fresh roster warning')).toBeTruthy()
  expect(previewMove).toHaveBeenCalledTimes(2)
  fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm claim' }))
  await waitFor(() =>
    expect(triggerWaiverClaim).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ espn_id: '1' }),
      undefined,
      expect.any(String),
      false,
    ),
  )
  expect(previewMove).toHaveBeenCalledTimes(2)
})
it('submits a dry run when the toggle is checked', async () => {
  start()
  fireEvent.click(await screen.findByRole('button', { name: 'Review and submit ESPN claim' }))
  const dialog = await screen.findByRole('dialog')
  fireEvent.click(within(dialog).getByLabelText(/Dry run/))
  fireEvent.click(within(dialog).getByRole('button', { name: 'Run dry run' }))
  await waitFor(() =>
    expect(triggerWaiverClaim).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      undefined,
      expect.any(String),
      true,
    ),
  )
  expect(await screen.findByText(/Dry run queued/)).toBeTruthy()
})
it('blocks a waiver for a player on another roster and offers a trade evaluation', async () => {
  vi.mocked(previewMove).mockResolvedValue({
    ...snapshot,
    incoming: [{ ...incoming, on_team_id: '1' }],
  })
  start('/moves/review?kind=waiver&week=4&add=1&drop=2')
  expect(await screen.findByText(/on another team's roster/)).toBeTruthy()
  const submit = screen.getByRole('button', { name: 'Review and submit ESPN claim' })
  expect((submit as HTMLButtonElement).disabled).toBe(true)
  const trade = screen.getByRole('link', { name: 'Evaluate as a trade' })
  expect(trade.getAttribute('href')).toBe('/moves/review?kind=trade&week=4&add=1&drop=2')
  expect(triggerWaiverClaim).not.toHaveBeenCalled()
})
it('allows a player already on our own roster through to review', async () => {
  vi.mocked(previewMove).mockResolvedValue({
    ...snapshot,
    incoming: [{ ...incoming, on_team_id: '8' }],
  })
  start()
  const submit = await screen.findByRole('button', { name: 'Review and submit ESPN claim' })
  expect((submit as HTMLButtonElement).disabled).toBe(false)
  expect(screen.queryByText(/on another team's roster/)).toBeNull()
})
it('rejects a multi-player waiver rather than silently submitting only the first player', async () => {
  start('/moves/review?add=1&add=2')
  const button = await screen.findByRole('button', { name: 'Review and submit ESPN claim' })
  expect((button as HTMLButtonElement).disabled).toBe(true)
  expect(triggerWaiverClaim).not.toHaveBeenCalled()
})
it('does not open confirmation if the refreshed player ids differ', async () => {
  vi.mocked(previewMove)
    .mockResolvedValueOnce(snapshot)
    .mockResolvedValueOnce({ ...snapshot, incoming: [{ ...incoming, espn_id: '2' }] })
  start()
  fireEvent.click(await screen.findByRole('button', { name: 'Review and submit ESPN claim' }))
  await screen.findByText(/The proposal changed/)
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(triggerWaiverClaim).not.toHaveBeenCalled()
})

afterEach(cleanup)

it('discards a review completed after the selected players change', async () => {
  let finish!: (value: typeof snapshot) => void
  vi.mocked(previewMove)
    .mockResolvedValueOnce(snapshot)
    .mockImplementationOnce(
      () => new Promise((resolve) => { finish = resolve }),
    )
    .mockResolvedValue({
      ...snapshot,
      incoming: [{ ...incoming, espn_id: '2', name: 'Second player' }],
    })
  start()
  fireEvent.click(await screen.findByRole('button', { name: 'Review and submit ESPN claim' }))
  await waitFor(() => expect(previewMove).toHaveBeenCalledTimes(2))
  fireEvent.click(screen.getByRole('link', { name: 'Change selection' }))
  await screen.findByText('Second player')
  await act(async () => {
    finish(snapshot)
    // Let the mutation observer publish its settled state before asserting absence.
    await new Promise((resolve) => setTimeout(resolve, 50))
  })
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(triggerWaiverClaim).not.toHaveBeenCalled()
})
