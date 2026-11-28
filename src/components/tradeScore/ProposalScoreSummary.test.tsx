import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { ProposalScoreSummary } from './ProposalScoreSummary'
import { acceptanceScore, completeScore, proposalEvaluation } from './fixtures'
import type { TradeOffer } from '../../api/types'

afterEach(cleanup)
const view = (score = completeScore()) => render(
  <MantineProvider><ProposalScoreSummary compact offer={{ evaluation: proposalEvaluation(score), message: null } as unknown as TradeOffer} /></MantineProvider>)

it('shows rest of season, the playoff-cost badge and the acceptance percent on a proposal card', () => {
  view(acceptanceScore())
  const tiles = within(screen.getByLabelText('Score terms summary'))
  expect(tiles.getByText('Rest of season')).toBeTruthy()
  expect(tiles.getByText('-2.3')).toBeTruthy()
  expect(screen.getAllByText('Costs playoff value').length).toBeGreaterThan(0)
  expect(within(screen.getByLabelText('Acceptance likelihood', { selector: 'p' })).getByText('62%')).toBeTruthy()
})

it('shows a dash for acceptance on proposals stored before the estimate and omits rest of season', () => {
  view()
  expect(within(screen.getByLabelText('Acceptance likelihood', { selector: 'p' })).getByText('—')).toBeTruthy()
  expect(within(screen.getByLabelText('Score terms summary')).queryByText('Rest of season')).toBeNull()
})
