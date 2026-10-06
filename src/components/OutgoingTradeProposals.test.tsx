import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { getOutgoingTradeOffers, getTeamNames } from '../api/client'
import { OutgoingTradeProposals } from './OutgoingTradeProposals'
import type { DraftConfig, TradeOffer } from '../api/types'

vi.mock('../api/client', () => ({ getOutgoingTradeOffers: vi.fn(), getTeamNames: vi.fn() }))
const config: DraftConfig = { league_id: '123', team_id: '7', season: 2026, mode: 'live' }
const offer: TradeOffer = {
  id: 1, status: 'awaiting_approval', league_id: '123', season: 2026,
  source: 'proposal', from_team_id: '7', to_team_id: '8',
  incoming_player_ids: ['4046'], outgoing_player_ids: ['9999'],
  incoming_players: [{ espn_id: '4046', name: 'Some Back' }],
  outgoing_players: [{ espn_id: '9999', name: null }],
  executed_at: '2026-10-05T13:00:00Z', message: 'Improve our receiving depth.',
}
beforeEach(() => {
  vi.mocked(getTeamNames).mockResolvedValue({ '8': 'Rival Team' })
  vi.mocked(getOutgoingTradeOffers).mockResolvedValue([offer])
})
afterEach(() => { cleanup(); vi.resetAllMocks() })
const view = (scope = config) => <MantineProvider><OutgoingTradeProposals config={scope} /></MantineProvider>

it('shows a busy skeleton until proposals arrive', () => {
  vi.mocked(getOutgoingTradeOffers).mockReturnValue(new Promise(() => {}))
  const { container } = render(view())
  expect(screen.getByRole('status', { name: 'Loading outgoing trade proposals' })).toBeTruthy()
  expect(container.querySelector('[aria-busy="true"]')).toBeTruthy()
  expect(screen.queryByText(/No outgoing proposals/)).toBeNull()
})

it('shows the counterparty, sides, pitch and pending status with ESPN-id fallbacks', async () => {
  render(view())
  expect(await screen.findByText('Rival Team')).toBeTruthy()
  expect(screen.getByText('Some Back')).toBeTruthy()
  expect(screen.getByText('ESPN player 9999')).toBeTruthy()
  expect(screen.getByText('You receive')).toBeTruthy()
  expect(screen.getByText('You send')).toBeTruthy()
  expect(screen.getByText('Improve our receiving depth.')).toBeTruthy()
  expect(screen.getByText('Awaiting approval')).toBeTruthy()
  expect(document.querySelector('time')?.getAttribute('datetime')).toBe(offer.executed_at)
  expect(getOutgoingTradeOffers).toHaveBeenCalledWith(config)
  expect(getTeamNames).toHaveBeenCalledWith('123')
  expect(screen.queryByRole('button', { name: /approve|send/i })).toBeNull()
})

it('shows a useful empty state without promising a proposal every scan', async () => {
  vi.mocked(getOutgoingTradeOffers).mockResolvedValue([])
  render(view())
  expect(await screen.findByText('No outgoing proposals awaiting approval.')).toBeTruthy()
})

it('allows retrying a failed read and keeps the error out of the empty state', async () => {
  vi.mocked(getOutgoingTradeOffers).mockRejectedValue(new Error('Offers unavailable'))
  render(view())
  expect(await screen.findByText(/Could not load outgoing proposals/)).toBeTruthy()
  expect(screen.queryByText('No outgoing proposals awaiting approval.')).toBeNull()
  expect(getOutgoingTradeOffers).toHaveBeenCalledOnce()
  vi.mocked(getOutgoingTradeOffers).mockResolvedValue([offer])
  fireEvent.click(screen.getByRole('button', { name: 'Refresh proposals' }))
  expect(await screen.findByText('Some Back')).toBeTruthy()
})

it('uses team-id and missing-pitch fallbacks if optional enrichment is unavailable', async () => {
  vi.mocked(getTeamNames).mockRejectedValue(new Error('Names unavailable'))
  vi.mocked(getOutgoingTradeOffers).mockResolvedValue([{ ...offer, message: null }])
  render(view())
  expect(await screen.findByText('Team 8')).toBeTruthy()
  expect(screen.getByText('No explanation provided.')).toBeTruthy()
})

it.each([
  { league_id: '456' }, { team_id: '9' }, { season: 2025 },
])('replaces proposals when configuration changes: %j', async (change) => {
  const { rerender } = render(view())
  await screen.findByText('Some Back')
  const next = { ...config, ...change }
  vi.mocked(getOutgoingTradeOffers).mockReturnValue(new Promise(() => {}))
  rerender(view(next))
  await waitFor(() => expect(getOutgoingTradeOffers).toHaveBeenCalledWith(next))
  expect(screen.queryByText('Some Back')).toBeNull()
  expect(screen.getByRole('status', { name: 'Loading outgoing trade proposals' })).toBeTruthy()
})

it('refreshes pending offers on demand', async () => {
  render(view())
  await screen.findByText('Some Back')
  vi.mocked(getOutgoingTradeOffers).mockResolvedValue([])
  fireEvent.click(screen.getByRole('button', { name: 'Refresh proposals' }))
  expect(await screen.findByText('No outgoing proposals awaiting approval.')).toBeTruthy()
})


it('warns when refresh fails while retaining the previously loaded proposals', async () => {
  render(view())
  await screen.findByText('Some Back')
  vi.mocked(getOutgoingTradeOffers).mockRejectedValue(new Error('Refresh unavailable'))
  fireEvent.click(screen.getByRole('button', { name: 'Refresh proposals' }))
  expect(await screen.findByText(/Previously loaded proposals.*out of date/)).toBeTruthy()
  expect(screen.getByText('Some Back')).toBeTruthy()
})
