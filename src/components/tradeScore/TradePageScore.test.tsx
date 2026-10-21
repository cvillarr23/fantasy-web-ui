import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter } from 'react-router-dom'
import { evaluateTrade, getTradeCandidates, getRosterDeficits, getCurrentWeek, getOutgoingTradeOffers, getTeamNames, getTradeContext, getByeOutlook, scoreTrade, searchPlayers } from '../../api/client'
import { getTradeProposalStates } from '../../api/tradeApproval'
import { DraftConfigContext } from '../../hooks/useDraftConfig'
import { TradePage } from '../TradePage'
import { candidates, finderDeficits } from '../tradeFinder/fixtures'
import { completeScore } from './fixtures'
import type { DraftConfig, LeagueTradeContext, PlayerSearchResult } from '../../api/types'

vi.mock('../../api/client', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../api/client')>(),
  getTradeCandidates: vi.fn(), getRosterDeficits: vi.fn(), getTradeContext: vi.fn(), getByeOutlook: vi.fn(), getCurrentWeek: vi.fn(), getOutgoingTradeOffers: vi.fn(), getTeamNames: vi.fn(),
  evaluateTrade: vi.fn(), searchPlayers: vi.fn(), scoreTrade: vi.fn(),
}))
vi.mock('../../api/tradeApproval', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../api/tradeApproval')>(),
  getTradeProposalStates: vi.fn().mockResolvedValue([]),
}))

const config: DraftConfig = { league_id: '123', team_id: '7', season: 2026, mode: 'live' }
const player = (player_id: string, espn_id: string, name: string): PlayerSearchResult => ({
  player_id, espn_id, name, position: 'RB', team: 'KC', injury_status: null, vorp_score: null, projected_points: null,
})
const team = (team_id: string, name: string) => ({
  team_id, name, roster: [], schedule: [], schedule_strength_z: null,
  strength: { points_per_week: null, completed_matchups: 0, completed_scoring_weeks: 0, unavailable_history_periods: 0, z_score: null },
  schedule_coverage: { scheduled_weeks: 0, bye_weeks: 0, unavailable_weeks: 0, strength_known_weeks: 0 },
})
const context: LeagueTradeContext = {
  league_id: '123', season: 2026, as_of_week: 5, start_week: 5, end_week: 8, regular_season_end_week: 14,
  lineup_slot_counts: {}, coverage: { unmapped_espn_ids: [], missing_metric_count: 0 },
  roster_snapshot: { kind: 'current', source: 'ESPN', fetched_at: '2026-10-07T12:00:00Z', observed_week: 5, matches_as_of_week: true },
  strength_metric: { name: 'completed_fantasy_points_per_week_z', source: 'ESPN', league_mean: null, league_stddev: null, teams_with_strength: 0 },
  teams: { '7': team('7', 'Our Team'), '8': team('8', 'Rival Team') },
}

beforeEach(() => {
  vi.mocked(getTradeCandidates).mockResolvedValue(candidates({ total: 0, items: [], team_counts: [] }))
  vi.mocked(getRosterDeficits).mockResolvedValue(finderDeficits)
  vi.mocked(getByeOutlook).mockRejectedValue(new Error('Unavailable'))
  vi.mocked(getTradeProposalStates).mockResolvedValue([])
  vi.mocked(getCurrentWeek).mockResolvedValue({ week: 5 })
  vi.mocked(getOutgoingTradeOffers).mockResolvedValue([])
  vi.mocked(getTeamNames).mockResolvedValue({})
  vi.mocked(getTradeContext).mockResolvedValue(context)
  vi.mocked(scoreTrade).mockResolvedValue(completeScore())
  vi.mocked(evaluateTrade).mockResolvedValue({ incoming_total: 7.75, outgoing_total: 4.25, delta_vorp: 3.5, missing_player_ids: [] })
})
afterEach(() => { cleanup(); vi.resetAllMocks() })

async function addPlayer(columnLabel: string, found: PlayerSearchResult) {
  vi.mocked(searchPlayers).mockResolvedValue([found])
  const column = screen.getByText(columnLabel).closest('.trade-side-column') as HTMLElement
  const input = within(column).getByPlaceholderText(/Search player/)
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value: found.name } })
  fireEvent.mouseDown(await within(column).findByText(found.name))
  fireEvent.click(within(column).getByRole('button', { name: 'Add' }))
}

it('scores the built trade with the counterparty and horizon chosen in the context panel', async () => {
  render(<MantineProvider><MemoryRouter initialEntries={['/trades?week=5']}>
    <DraftConfigContext.Provider value={{ config, loading: false, saveConfig: vi.fn(), setConfig: vi.fn() }}>
      <TradePage />
    </DraftConfigContext.Provider>
  </MemoryRouter></MantineProvider>)

  fireEvent.click(await screen.findByText('Build your own', { selector: 'summary' }))
  fireEvent.click(screen.getByText('League context', { selector: 'summary' }))
  const scoreButton = await screen.findByRole('button', { name: 'Score trade' }) as HTMLButtonElement
  expect(scoreButton.disabled).toBe(true)
  expect(screen.getByText(/Select a counterparty to score/)).toBeTruthy()

  fireEvent.change(await screen.findByRole('combobox', { name: 'Counterparty' }), { target: { value: '8' } })
  fireEvent.change(screen.getByRole('combobox', { name: 'Horizon' }), { target: { value: '6' } })
  await addPlayer('You receive', player('p200', '200', 'Received Wideout'))
  await addPlayer('You send', player('p100', '100', 'Sent Back'))

  await waitFor(() => expect(scoreButton.disabled).toBe(false))
  fireEvent.click(scoreButton)
  expect(await screen.findByText('Weeks 5–8 · 4 of 4 scored')).toBeTruthy()
  expect(scoreTrade).toHaveBeenCalledWith({
    league_id: '123', season: 2026, week: 5, horizon: 6, our_team_id: '7', counterparty_team_id: '8',
    send_espn_ids: ['100'], receive_espn_ids: ['200'],
  })

  // The manual VORP comparison is unchanged: internal player ids, single week.
  fireEvent.click(screen.getByRole('button', { name: 'Compare VORP' }))
  await waitFor(() => expect(evaluateTrade).toHaveBeenCalledWith(['p200'], ['p100'], 2026, 5))
})


it('puts approval first and keeps the builder and context collapsed with the finder between approval and the builder', async () => {
  render(<MantineProvider><MemoryRouter initialEntries={['/trades?week=5']}>
    <DraftConfigContext.Provider value={{ config, loading: false, saveConfig: vi.fn(), setConfig: vi.fn() }}><TradePage /></DraftConfigContext.Provider>
  </MemoryRouter></MantineProvider>)
  expect(await screen.findByRole('heading', { name: 'Trades', level: 1 })).toBeTruthy()
  expect(screen.getByText('Build your own', { selector: 'summary' }).closest('details')!.open).toBe(false)
  expect(screen.getByText('League context', { selector: 'summary' }).closest('details')!.open).toBe(false)
  expect(screen.getByRole('heading', { name: 'Ready to approve' }).closest('section')!.id).toBe('approve')
  expect(screen.getByRole('heading', { name: 'Trade finder' })).toBeTruthy()
  expect((await screen.findByRole('link', { name: '0 proposable trades found' })).getAttribute('href')).toBe('#finder')
  expect(await screen.findByRole('link', { name: /0 proposals awaiting/ })).toBeTruthy()
})
