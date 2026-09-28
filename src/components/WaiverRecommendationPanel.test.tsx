import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { WaiverRecommendationPanel } from './WaiverRecommendationPanel'
import { triggerWaiverClaim } from '../api/client'
import type { DraftConfig, WaiverRecommendation } from '../api/types'

vi.mock('../api/client', () => ({ triggerWaiverClaim: vi.fn() }))

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

afterEach(() => { cleanup(); vi.clearAllMocks() })

async function submitClaim() {
  render(<MantineProvider><WaiverRecommendationPanel recommendations={[recommendation]} config={config} /></MantineProvider>)
  fireEvent.click(screen.getByRole('button', { name: 'Submit ESPN claim' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Confirm claim' }))
}

it('submits the selected players and displays the tracking ID', async () => {
  vi.mocked(triggerWaiverClaim).mockResolvedValue({ status: 'accepted', queue: 'waiver_actions', team_id: '7', tracking_id: 'track-123' })

  await submitClaim()

  await waitFor(() => expect(triggerWaiverClaim).toHaveBeenCalledWith(config, recommendation.free_agent, recommendation.bench_player))
  expect(await screen.findByText(/track-123/)).toBeTruthy()
})

it('shows a useful backend rejection', async () => {
  vi.mocked(triggerWaiverClaim).mockRejectedValue(new Error('team: Field required'))

  await submitClaim()

  expect(await screen.findByText(/team: Field required/)).toBeTruthy()
})
