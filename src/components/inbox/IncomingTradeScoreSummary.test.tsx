import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { IncomingTradeScoreSummary } from './IncomingTradeScoreSummary'
import { offer } from './inboxFixtures'
afterEach(cleanup)
it('uses returned numbers, exposes all coverage warnings and marks shadow policy as advisory', () => {
  render(
    <MantineProvider>
      <IncomingTradeScoreSummary
        row={{
          ...offer,
          other_items: [{ type: 'DRAFT_TRADE' }],
          score: {
            ...offer.score!,
            final_score: 987,
            stale: true,
            complete_horizon: false,
            state: 'incomplete',
            unmapped_espn_ids: ['111'],
            exceeds_roster_limit: true,
            unavailable_reasons: ['future_reason'],
          },
          shadow_policy: {
            would: 'accept',
            reason: 'threshold',
            policy_version: 'shadow-v1',
            thresholds: { accept_min: 1, decline_max: null },
          },
        }}
      />
    </MantineProvider>,
  )
  expect(screen.getByText('Final score: +987.0')).toBeTruthy()
  expect(screen.getByText('Stale score')).toBeTruthy()
  expect(screen.getByText('Incomplete horizon')).toBeTruthy()
  expect(screen.getByText(/Unmapped players: 111/)).toBeTruthy()
  expect(screen.getByText(/drops are not simulated/)).toBeTruthy()
  expect(screen.getByText(/Draft-pick, FAAB/)).toBeTruthy()
  expect(screen.getByText(/future_reason/)).toBeTruthy()
  expect(screen.getByText(/Would accept — not acted on/)).toBeTruthy()
})
it.each([
  null,
  { ...offer.score!, final_score: null, raw_delta_vorp: null, state: 'unavailable' as const },
])('missing evidence never becomes zero', (score) => {
  render(
    <MantineProvider>
      <IncomingTradeScoreSummary row={{ ...offer, score }} />
    </MantineProvider>,
  )
  expect(screen.getByText('Final score: Score unavailable')).toBeTruthy()
  expect(screen.getByText(/Raw ΔVORP: Not available/)).toBeTruthy()
  expect(screen.queryByText(/Final score:.*0\.0/)).toBeNull()
})
