import { cleanup, render, screen, within } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { afterEach, expect, it } from 'vitest'
import { MatchupTeamCard } from './MatchupTeamCard'
import { matchupFixture } from './fixtures'

afterEach(cleanup)

function renderCard(which: 'our_team' | 'opponent') {
  const side = matchupFixture()[which]
  render(<MantineProvider><MatchupTeamCard id="card" side={side} label="Your team" /></MantineProvider>)
  return within(screen.getByRole('region', { name: `Your team: ${side.team.name}` }))
}

it('shows the slot once when it matches the position, and both when they differ', () => {
  const card = renderCard('our_team')
  expect(card.queryByText('RB · RB')).toBeNull()
  expect(card.queryByText('WR · WR')).toBeNull()
  expect(card.getAllByText('RB').length).toBeGreaterThan(0)
  expect(card.getByText('FLEX · WR')).toBeTruthy()
})

it('shows a dash for a player with no score yet, never 0.0', () => {
  const card = renderCard('our_team')
  // Kicker and defense have 0.0 actuals, Receiver B has null: all unknown.
  expect(card.getAllByText('—').length).toBeGreaterThanOrEqual(6)
  expect(card.queryByText('0.0', { selector: '.score-value.actual strong' })).toBeNull()
})

it('flags a starter projected for 0.0 with text on wide screens and a labeled "!" on phones', () => {
  const card = renderCard('our_team')
  expect(card.getByText('Projected 0.0')).toBeTruthy()
  expect(card.getByRole('img', { name: 'Projected 0.0' }).textContent).toBe('!')
  const zero = card.getAllByText('0.0')
  expect(zero.every((el) => el.closest('.score-value')?.classList.contains('zero'))).toBe(true)
})

it('colors a benched 0.0 projection but does not add the starter label', () => {
  const card = renderCard('opponent')
  expect(card.queryByRole('img', { name: 'Projected 0.0' })).toBeNull()
  expect(card.queryByText('Projected 0.0')).toBeNull()
  const bench = card.getAllByText('0.0').filter((el) => el.closest('.score-value.projected.zero'))
  expect(bench.length).toBeGreaterThan(0)
})

it('keeps the bench in a collapsed panel with its count', () => {
  const card = renderCard('our_team')
  const summary = card.getByText('Bench (4)')
  expect(summary.closest('details')?.hasAttribute('open')).toBe(false)
})

it('keeps the suggested-swap badge on wide screens', () => {
  const side = matchupFixture().our_team
  side.starters[1].suggested_swap = { bench_for: 'Sample Runner C' }
  render(<MantineProvider><MatchupTeamCard id="card" side={side} label="Your team" /></MantineProvider>)
  expect(screen.getByText('swap?')).toBeTruthy()
})
