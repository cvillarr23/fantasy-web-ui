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
    matches: false,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

const config: DraftConfig = { league_id: '123', team_id: '7', season: 2026, mode: 'live' }
const recommendation: WaiverRecommendation = {
  position: 'RB',
  vorp_delta: 8,
  free_agent: {
    espn_id: '4046',
    name: 'Some Back',
    pro_team: 'KC',
    injury_status: null,
    net_vorp: 9,
  },
  bench_player: {
    espn_id: '9999',
    name: 'Bench Back',
    pro_team: 'NO',
    injury_status: null,
    net_vorp: 1,
  },
  rumor_sentiment: null,
  rumor_confidence: null,
  rumor_suggested_action: null,
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
