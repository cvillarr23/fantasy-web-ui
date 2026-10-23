import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { WaiverRecommendationPanel } from './WaiverRecommendationPanel'
import { MemoryRouter } from 'react-router-dom'
import type { DraftConfig, WaiverRecommendation } from '../api/types'

vi.mock('../api/client', () => ({ getCurrentWeek: vi.fn().mockResolvedValue({ week: 5 }) }))

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    matches: false, addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  })),
})

const config: DraftConfig = { league_id: '123', team_id: '7', season: 2026, mode: 'live' }
const recommendation: WaiverRecommendation = {
  position: 'RB', vorp_delta: 8,
  free_agent: { espn_id: '4046', name: 'Some Back', pro_team: 'KC', injury_status: null, net_vorp: 9 },
  bench_player: { espn_id: '9999', name: 'Bench Back', pro_team: 'NO', injury_status: null, net_vorp: 1 },
  rumor_sentiment: null, rumor_confidence: null, rumor_suggested_action: null,
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it('labels add/drop explicitly and links to a review without submitting', () => {
  render(
    <MantineProvider>
      <MemoryRouter initialEntries={['/waivers?week=7']}>
        <WaiverRecommendationPanel recommendations={[recommendation]} config={config} />
      </MemoryRouter>
    </MantineProvider>,
  )
  expect(
    within(screen.getByText('Add to your roster').parentElement!).getByText('Some Back'),
  ).toBeTruthy()
  expect(
    within(screen.getByText('Drop from your roster').parentElement!).getByText('Bench Back'),
  ).toBeTruthy()
  const dropped = screen.getByText('Drop from your roster').parentElement!
  expect(within(dropped).getByText('NO')).toBeTruthy()
  expect(within(dropped).queryByText('RB · NO')).toBeNull()
  const link = screen.getByRole('link', { name: 'Review move' })
  expect(link.getAttribute('href')).toBe('/moves/review?kind=waiver&week=7&add=4046&drop=9999')
  expect(screen.queryByRole('button', { name: 'Confirm claim' })).toBeNull()
})

it('shows the dropped player’s own position on a cross-position swap', () => {
  const crossPositionSwap: WaiverRecommendation = {
    ...recommendation,
    position: 'D/ST',
    bench_player: {
      ...recommendation.bench_player!,
      name: 'Chris Godwin',
      pro_team: 'TB',
      position: 'WR',
    },
    // A flex-slot add: the player's own position differs from the slot's.
    free_agent: { ...recommendation.free_agent, position: 'TE' },
  }
  render(<MantineProvider><MemoryRouter>
    <WaiverRecommendationPanel config={config} recommendations={[crossPositionSwap]} />
  </MemoryRouter></MantineProvider>)
  const dropped = screen.getByText('Drop from your roster').parentElement!
  expect(within(dropped).getByText('WR · TB')).toBeTruthy()
  // The add side uses the free agent's own position too, not just the slot's.
  const added = screen.getByText('Add to your roster').parentElement!
  expect(within(added).getByText(`TE · ${recommendation.free_agent.pro_team}`)).toBeTruthy()
})

it('renders IR-and-add with no drop or review action alongside ordinary swaps', () => {
  render(
    <MantineProvider><MemoryRouter initialEntries={['/waivers?week=7']}>
      <WaiverRecommendationPanel config={config} recommendations={[
        recommendation,
        { ...recommendation, kind: 'ir_and_add', bench_player: null,
          free_agent: { ...recommendation.free_agent, espn_id: '1234', name: 'New Back' },
          ir_player: { ...recommendation.bench_player!, name: 'Injured Back', injury_status: 'OUT' } },
      ]} />
    </MemoryRouter></MantineProvider>,
  )
  const irRow = screen.getByText('New Back').closest('li')!
  expect(within(irRow).getByText('Move to IR')).toBeTruthy()
  expect(within(irRow).getByText('Injured Back')).toBeTruthy()
  expect(within(irRow).getByText('Nobody is dropped.')).toBeTruthy()
  expect(within(irRow).getByText(/Make this IR move and add in ESPN/)).toBeTruthy()
  expect(within(irRow).queryByText('Drop from your roster')).toBeNull()
  expect(within(irRow).queryByRole('link', { name: 'Review move' })).toBeNull()
  expect(screen.getAllByRole('link', { name: 'Review move' })).toHaveLength(1)
})

it('handles a swap with no bench player safely', () => {
  render(<MantineProvider><MemoryRouter>
    <WaiverRecommendationPanel config={config} recommendations={[{ ...recommendation, bench_player: null }]} />
  </MemoryRouter></MantineProvider>)
  expect(screen.getByText('Some Back')).toBeTruthy()
  expect(screen.queryByRole('link', { name: 'Review move' })).toBeNull()
})

it('renders an add-only pickup with no drop side and reviews it without a drop', () => {
  render(<MantineProvider><MemoryRouter initialEntries={['/waivers?week=7']}>
    <WaiverRecommendationPanel config={config} openRosterSlots={1} recommendations={[
      { ...recommendation, kind: 'add', bench_player: null },
    ]} />
  </MemoryRouter></MantineProvider>)
  expect(screen.getByText('1 open roster slot')).toBeTruthy()
  const row = screen.getByText('Some Back').closest('li')!
  expect(within(row).queryByText('Drop from your roster')).toBeNull()
  expect(within(row).getByText(/fills an open roster slot/)).toBeTruthy()
  expect(within(row).getByRole('link', { name: 'Review move' }).getAttribute('href'))
    .toBe('/moves/review?kind=waiver&week=7&add=4046')
})

it('hides the open roster slot count when the roster is full', () => {
  render(<MantineProvider><MemoryRouter>
    <WaiverRecommendationPanel config={config} openRosterSlots={0} recommendations={[recommendation]} />
  </MemoryRouter></MantineProvider>)
  expect(screen.queryByText(/open roster slot/)).toBeNull()
})

it('marks a bye fill-in, shows byes and the horizon lineup effect', () => {
  const fillIn: WaiverRecommendation = {
    ...recommendation,
    vorp_delta: -0.5,
    free_agent: { ...recommendation.free_agent, bye_week: 12 },
    bench_player: { ...recommendation.bench_player!, bye_week: 7 },
    weekly_lineup_gains: [
      { week: 7, delta: 0 }, { week: 8, delta: 4.2 }, { week: 9, delta: 0 }, { week: 10, delta: null },
    ],
    horizon_lineup_gain: 4.2,
    bye_fill: { week: 8, lineup_gain: 4.2 },
  }
  render(
    <MantineProvider>
      <MemoryRouter initialEntries={['/waivers?week=7']}>
        <WaiverRecommendationPanel
          recommendations={[fillIn]}
          config={config}
          horizonWeeks={[7, 8, 9, 10]}
          byeCrunchWeeks={[8]}
        />
      </MemoryRouter>
    </MantineProvider>,
  )
  expect(screen.getByText(/byes leave your lineup short in week 8/)).toBeTruthy()
  expect(screen.getByText('Covers Wk 8 bye')).toBeTruthy()
  expect(screen.getByText(/Value over replacement -0.5 per week, Wk 7–10/)).toBeTruthy()
  expect(screen.getByText('Starting lineup +4.2: Wk 7 +0.0 · Wk 8 +4.2 · Wk 9 +0.0 · Wk 10 unknown')).toBeTruthy()
  // The dropped player is on bye in the viewed week; the add's bye is still ahead.
  expect(within(screen.getByText('Drop from your roster').parentElement!).getByText('BYE')).toBeTruthy()
  expect(within(screen.getByText('Add to your roster').parentElement!).getByText('Bye Wk 12')).toBeTruthy()
})
