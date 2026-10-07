import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { ApiError, getTradeContext, scoreTrade } from '../../api/client'
import { TradeScorePanel } from './TradeScorePanel'
import { completeScore } from './fixtures'
import type { DraftConfig, PlayerSearchResult } from '../../api/types'
import type { TradeContextControls } from '../../hooks/useTradeContextControls'

vi.mock('../../api/client', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../api/client')>(),
  scoreTrade: vi.fn(),
  getTradeContext: vi.fn(),
}))

const config: DraftConfig = { league_id: '123', team_id: '7', season: 2026, mode: 'live' }
const player = (player_id: string, espn_id: string | null, name: string): PlayerSearchResult => ({
  player_id, espn_id, name, position: 'RB', team: 'KC', injury_status: null, vorp_score: null, projected_points: null,
})
const receive = [player('p200', '200', 'Received Wideout')]
const send = [player('p100', '100', 'Sent Back')]
const controls = (over: Partial<TradeContextControls> = {}): TradeContextControls => ({
  counterpartyTeamId: '8', onCounterpartyTeamChange: vi.fn(), horizon: 4, onHorizonChange: vi.fn(), ...over,
})
type Props = Parameters<typeof TradeScorePanel>[0]
const props = (over: Partial<Props> = {}): Props => ({ config, week: 5, incoming: receive, outgoing: send, controls: controls(), ...over })
const view = (p: Props = props()) => <MantineProvider><TradeScorePanel {...p} /></MantineProvider>
const button = () => screen.getByRole('button', { name: 'Score trade' }) as HTMLButtonElement

beforeEach(() => {
  vi.mocked(getTradeContext).mockReturnValue(new Promise(() => {}))
  vi.mocked(scoreTrade).mockResolvedValue(completeScore())
})
afterEach(() => { cleanup(); vi.resetAllMocks() })

it.each([
  [{ controls: controls({ counterpartyTeamId: '' }) }, /Select a counterparty in League trade context/],
  [{ incoming: [] }, /at least one player on each side/],
  [{ outgoing: [] }, /at least one player on each side/],
  [{ outgoing: [player('p9', null, 'No Espn Guy')] }, /No Espn Guy has no ESPN id/],
  [{ week: '' }, /Select a valid week/],
])('explains why a trade cannot be scored yet: %#', (over, reason) => {
  render(view(props(over)))
  expect(button().disabled).toBe(true)
  expect(screen.getByText(reason)).toBeTruthy()
})

it('scores with ESPN ids, the shared horizon and counterparty, and shows the breakdown', async () => {
  render(view(props({ controls: controls({ horizon: 6 }) })))
  fireEvent.click(button())
  expect(await screen.findByText('Weeks 5–8 · 4 of 4 scored')).toBeTruthy()
  expect(scoreTrade).toHaveBeenCalledWith({
    league_id: '123', season: 2026, week: 5, horizon: 6, our_team_id: '7', counterparty_team_id: '8',
    send_espn_ids: ['100'], receive_espn_ids: ['200'],
  })
})

it('shows progress while scoring', async () => {
  vi.mocked(scoreTrade).mockReturnValue(new Promise(() => {}))
  render(view())
  fireEvent.click(button())
  expect(await screen.findByRole('status', { name: /Scoring trade/ })).toBeTruthy()
})

it.each([
  ['week', { week: 6 }],
  ['horizon', { controls: controls({ horizon: 5 }) }],
  ['counterparty', { controls: controls({ counterpartyTeamId: '9' }) }],
  ['players', { incoming: [...receive, player('p300', '300', 'Another')] }],
  ['league', { config: { ...config, league_id: '456' } }],
  ['team', { config: { ...config, team_id: '1' } }],
  ['season', { config: { ...config, season: 2025 } }],
])('never shows a score for different inputs after the %s changes', async (_name, over) => {
  const { rerender } = render(view())
  fireEvent.click(button())
  await screen.findByText('Weeks 5–8 · 4 of 4 scored')
  rerender(view(props(over)))
  expect(screen.queryByText('Weeks 5–8 · 4 of 4 scored')).toBeNull()
  expect(screen.getByText(/Inputs changed/)).toBeTruthy()
})

it('keeps the score when only the player order changes', async () => {
  const two = [...receive, player('p300', '300', 'Another')]
  const { rerender } = render(view(props({ incoming: two })))
  fireEvent.click(button())
  await screen.findByText('Weeks 5–8 · 4 of 4 scored')
  rerender(view(props({ incoming: [...two].reverse() })))
  expect(screen.getByText('Weeks 5–8 · 4 of 4 scored')).toBeTruthy()
})

it.each([
  [409, 'Player 100 is not on team 7', /not on the side that would send them[^]*Player 100 is not on team 7/],
  [422, 'week: must be at most 18', /rejected the request[^]*week: must be at most 18/],
  [503, 'context down', /Trade context is unavailable/],
  [504, 'ESPN request timed out', /ESPN timed out/],
  [502, 'Could not reach ESPN', /Could not reach ESPN/],
  [500, 'boom', /Could not score this trade[^]*boom/],
])('explains a %s from the scorer', async (status, message, copy) => {
  vi.mocked(scoreTrade).mockRejectedValue(new ApiError(status, message))
  render(view())
  fireEvent.click(button())
  await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(copy))
})
