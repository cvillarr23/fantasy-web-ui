import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter } from 'react-router-dom'
import { getTradeContext, getCurrentWeek, getOutgoingTradeOffers, getTeamNames } from '../api/client'
import { TradeContextPanel } from './TradeContextPanel'
import { useTradeContextControls } from '../hooks/useTradeContextControls'
import { TradePage } from './TradePage'
import { DraftConfigContext } from '../hooks/useDraftConfig'
import type { DraftConfig } from '../api/types'

vi.mock('../api/client', () => ({ getTradeContext: vi.fn(), getCurrentWeek: vi.fn(), getOutgoingTradeOffers: vi.fn().mockResolvedValue([]), getTeamNames: vi.fn().mockResolvedValue({}), evaluateTrade: vi.fn(), searchPlayers: vi.fn() }))
const config: DraftConfig = { league_id: '123', team_id: '1', season: 2026, mode: 'live' }
function fixture() {
  const strength = { points_per_week: 100, completed_matchups: 2, completed_scoring_weeks: 2, unavailable_history_periods: 1, z_score: 0 }
  const coverage = { scheduled_weeks: 1, bye_weeks: 1, unavailable_weeks: 1, strength_known_weeks: 1 }
  const schedule = [
    { week: 5, matchup_period: 5, status: 'scheduled' as const, opponent_team_id: '1', opponent_name: 'Ours', opponent_strength_z: 0 },
    { week: 6, matchup_period: 6, status: 'bye' as const, opponent_team_id: null, opponent_name: null, opponent_strength_z: null },
    { week: 7, matchup_period: 7, status: 'unavailable' as const, opponent_team_id: null, opponent_name: null, opponent_strength_z: null },
  ]
  return {
    league_id: '123', season: 2026, as_of_week: 5, start_week: 5, end_week: 7, regular_season_end_week: 7,
    lineup_slot_counts: { QB: 1 },
    roster_snapshot: { kind: 'current' as const, source: 'ESPN mRoster', fetched_at: '2026-10-07T12:00:00Z', observed_week: 6, matches_as_of_week: false },
    strength_metric: { name: 'completed_fantasy_points_per_week_z' as const, source: 'Stored ESPN completed regular-season scoring weeks', league_mean: 100, league_stddev: 10, teams_with_strength: 2 },
    coverage: { unmapped_espn_ids: ['-16002'], missing_metric_count: 8 },
    teams: {
      '1': { team_id: '1', name: 'Ours', roster: [], strength, schedule: [{ ...schedule[0], opponent_team_id: '2', opponent_name: 'Rivals' }], schedule_coverage: coverage, schedule_strength_z: 0 },
      '2': { team_id: '2', name: 'Rivals', roster: [
        { espn_id: '12483', player_id: '500', name: 'Mapped Player', position: 'QB', nfl_team: 'LA', slot: 'QB', eligible_slots: ['QB'], injury_status: null, metrics: { '5': { vorp_score: 0, projected_points: 12 } } },
        { espn_id: '-16002', player_id: null, name: null, position: 'D/ST', nfl_team: null, slot: 'BENCH', eligible_slots: [], injury_status: 'OUT', metrics: { '5': { vorp_score: null, projected_points: null } } },
      ], strength: { ...strength, z_score: null }, schedule, schedule_coverage: coverage, schedule_strength_z: null },
    },
  }
}
beforeEach(() => {
  vi.mocked(getCurrentWeek).mockResolvedValue({ week: 5 })
  vi.mocked(getOutgoingTradeOffers).mockResolvedValue([])
  vi.mocked(getTeamNames).mockResolvedValue({})
  vi.mocked(getTradeContext).mockResolvedValue(fixture())
})
afterEach(() => { cleanup(); vi.resetAllMocks() })
function ContextHarness({ config }: { config: DraftConfig }) {
  const controls = useTradeContextControls(config)
  return <TradeContextPanel config={config} controls={controls} />
}
function view(scope = config) {
  return <MantineProvider><MemoryRouter initialEntries={['/trades?week=5']}><DraftConfigContext.Provider value={{ config: scope, loading: false, saveConfig: vi.fn(), setConfig: vi.fn() }}><ContextHarness config={scope} /></DraftConfigContext.Provider></MemoryRouter></MantineProvider>
}
async function selectRival() {
  const select = await screen.findByRole('combobox', { name: 'Counterparty' })
  fireEvent.change(select, { target: { value: '2' } })
}
it('shows loading until the scoped context arrives', () => {
  vi.mocked(getTradeContext).mockReturnValue(new Promise(() => {}))
  render(view())
  expect(screen.getByRole('status', { name: 'Loading trade context' })).toBeTruthy()
})
it('presents current ownership, identities, provenance and exact-week metrics', async () => {
  render(view())
  await selectRival()
  expect(getTradeContext).toHaveBeenCalledWith('123', 2026, 5, 4, expect.any(AbortSignal))
  expect(screen.getByText('Mapped Player')).toBeTruthy()
  expect(screen.getByText('ESPN player -16002')).toBeTruthy()
  expect(screen.getByText(/Internal mapping unavailable/)).toBeTruthy()
  expect(screen.getByText(/Current ownership.*historical/)).toBeTruthy()
  expect(screen.getByText(/ESPN mRoster/)).toBeTruthy()
  expect(screen.getByText('Missing player-week metrics').nextElementSibling?.textContent).toBe('8')
  expect(screen.getByText('Unmapped players').nextElementSibling?.textContent).toBe('1')
  expect(screen.getByText(/Weeks 5–7/)).toBeTruthy()
  expect(document.querySelector('time')?.getAttribute('datetime')).toBe('2026-10-07T12:00:00Z')
  const row = screen.getByText('Mapped Player').closest('tr')!
  expect(within(row).getByText('0.0')).toBeTruthy()
  expect(within(row).getByText('12.0')).toBeTruthy()
})
it('distinguishes unknown strength, real zero, bye and unavailable pairing', async () => {
  render(view())
  await selectRival()
  expect(screen.getAllByText('Strength unknown').length).toBeGreaterThan(0)
  expect(screen.getAllByText('Strength 0.0 average').length).toBeGreaterThan(0)
  expect(screen.getByText('Bye')).toBeTruthy()
  expect(screen.getByText('Pairing unavailable')).toBeTruthy()
  expect(screen.getAllByText(/Head-to-head/).length).toBe(2)
  fireEvent.focus(within(screen.getByText('Observed strength')).getByRole('button'))
  expect((await screen.findByRole('tooltip')).textContent).toMatch(/Stored ESPN completed regular-season scoring weeks/)
  expect(screen.getAllByText(/1 unavailable history/).length).toBe(2)
})
it('supports retry and warns when a refresh fails with cached data', async () => {
  vi.mocked(getTradeContext).mockRejectedValue(new Error('ESPN unavailable'))
  render(view())
  expect(await screen.findByText(/Could not load trade context.*ESPN unavailable/)).toBeTruthy()
  vi.mocked(getTradeContext).mockResolvedValue(fixture())
  fireEvent.click(screen.getByRole('button', { name: 'Refresh context' }))
  await selectRival()
  vi.mocked(getTradeContext).mockRejectedValue(new Error('Refresh failed'))
  fireEvent.click(screen.getByRole('button', { name: 'Refresh context' }))
  expect(await screen.findByText(/Previously loaded context.*out of date/)).toBeTruthy()
  expect(screen.getByText('Mapped Player')).toBeTruthy()
})
it('fetches a changed horizon without displaying the previous context', async () => {
  render(view())
  await selectRival()
  vi.mocked(getTradeContext).mockReturnValue(new Promise(() => {}))
  fireEvent.change(screen.getByRole('combobox', { name: 'Horizon' }), { target: { value: '2' } })
  expect(screen.queryByText('Mapped Player')).toBeNull()
  expect(getTradeContext).toHaveBeenLastCalledWith('123', 2026, 5, 2, expect.any(AbortSignal))
})
it('clears incompatible context when league or season changes', async () => {
  const { rerender } = render(view())
  await selectRival()
  vi.mocked(getTradeContext).mockReturnValue(new Promise(() => {}))
  rerender(view({ ...config, league_id: '456', season: 2025 }))
  expect(screen.queryByText('Mapped Player')).toBeNull()
})
it('handles missing configured team and empty regular-season schedules', async () => {
  const data = fixture()
  data.teams['1'].schedule = []
  data.teams['2'].schedule = []
  vi.mocked(getTradeContext).mockResolvedValue(data)
  render(view({ ...config, team_id: '9' }))
  await selectRival()
  expect(screen.getByText(/Configured team.*missing/)).toBeTruthy()
  expect(screen.getByText(/No remaining regular-season schedule/)).toBeTruthy()
})

it('follows the live week when the URL has no selection', async () => {
  render(<MantineProvider><MemoryRouter><ContextHarness config={config} /></MemoryRouter></MantineProvider>)
  await screen.findByRole('combobox', { name: 'Counterparty' })
  expect(getTradeContext).toHaveBeenCalledWith('123', 2026, 5, 4, expect.any(AbortSignal))
})
it('defers context until a live week is available', () => {
  vi.mocked(getCurrentWeek).mockReturnValue(new Promise(() => {}))
  render(<MantineProvider><MemoryRouter><ContextHarness config={config} /></MemoryRouter></MantineProvider>)
  expect(getTradeContext).not.toHaveBeenCalled()
  expect(screen.getByText(/Select a valid league, season and week/)).toBeTruthy()
})
it('integrates with proposals and the builder, following its week selector', async () => {
  render(<MantineProvider><MemoryRouter initialEntries={['/trades?week=5']}>
    <DraftConfigContext.Provider value={{ config, loading: false, saveConfig: vi.fn(), setConfig: vi.fn() }}>
      <TradePage />
    </DraftConfigContext.Provider>
  </MemoryRouter></MantineProvider>)
  await selectRival()
  expect(screen.getByRole('heading', { name: 'Outgoing trade proposals' })).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Evaluate a trade' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Compare VORP' })).toBeTruthy()
  vi.mocked(getTradeContext).mockReturnValue(new Promise(() => {}))
  fireEvent.change(screen.getByRole('combobox', { name: 'Week' }), { target: { value: '6' } })
  expect(screen.queryByText('Mapped Player')).toBeNull()
  expect(getTradeContext).toHaveBeenLastCalledWith('123', 2026, 6, 4, expect.any(AbortSignal))
})
it('shows empty roster and no counterparties independently of unavailable context', async () => {
  const data = fixture()
  data.teams['2'].roster = []
  vi.mocked(getTradeContext).mockResolvedValue(data)
  render(view())
  await selectRival()
  expect(screen.getByText('No players in the current roster snapshot.')).toBeTruthy()
})
it('shows no counterparties when only our team is returned', async () => {
  const data = fixture()
  vi.mocked(getTradeContext).mockResolvedValue({ ...data, teams: { '1': data.teams['1'] } })
  render(view())
  expect(await screen.findByText('No counterparties available in this league context.')).toBeTruthy()
})
it('clears a counterparty selection when it becomes the configured team', async () => {
  const { rerender } = render(view())
  await selectRival()
  rerender(view({ ...config, team_id: '2' }))
  expect(screen.queryByText('Mapped Player')).toBeNull()
  expect((screen.getByRole('combobox', { name: 'Counterparty' }) as HTMLSelectElement).value).toBe('')
})
