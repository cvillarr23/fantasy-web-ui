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
  const link = screen.getByRole('link', { name: 'Review move' })
  expect(link.getAttribute('href')).toBe('/moves/review?kind=waiver&week=7&add=4046&drop=9999')
  expect(screen.queryByRole('button', { name: 'Confirm claim' })).toBeNull()
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
