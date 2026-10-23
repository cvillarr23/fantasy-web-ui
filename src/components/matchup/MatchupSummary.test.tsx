import { cleanup, render, screen, within } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { afterEach, expect, it } from 'vitest'
import { MatchupSummary } from './MatchupSummary'
import { matchupFixture } from './fixtures'

afterEach(cleanup)

function renderSummary(patch?: (m: ReturnType<typeof matchupFixture>) => void) {
  const matchup = matchupFixture()
  patch?.(matchup)
  render(<MantineProvider><MatchupSummary ours={matchup.our_team.team} opponent={matchup.opponent.team} /></MantineProvider>)
  return within(screen.getByRole('region', { name: 'Matchup summary' }))
}

it('shows both totals, the projected margin and an estimated win chance', () => {
  const summary = renderSummary()
  expect(summary.getByText('62.4')).toBeTruthy()
  expect(summary.getByText('118.2')).toBeTruthy()
  expect(summary.getByText('48.1')).toBeTruthy()
  expect(summary.getByText('109.6')).toBeTruthy()
  expect(summary.getByText('+8.6')).toBeTruthy()
  expect(summary.getByText('~63%')).toBeTruthy()
  expect(summary.getByText('Estimate from projected totals')).toBeTruthy()
})

it('shows a dash for a total of 0.0 instead of zero', () => {
  const summary = renderSummary((m) => { m.our_team.team.score = 0; m.opponent.team.score = 0 })
  expect(summary.queryByText('0.0')).toBeNull()
  expect(summary.getAllByText('—').length).toBeGreaterThanOrEqual(2)
})

it('shows dashes, not zero, when a projection is missing', () => {
  const summary = renderSummary((m) => { m.opponent.team.projected = null })
  expect(summary.queryByText(/^~\d+%$/)).toBeNull()
  // The opponent's projected total and the win chance are dashes; the margin tile says so in words.
  expect(summary.getAllByText('—')).toHaveLength(2)
  expect(summary.queryByText('Not available')).toBeTruthy()
})
