import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { TradeScoreBreakdown } from './TradeScoreBreakdown'
import { completeScore, partialScore, unscoredScore } from './fixtures'
import type { TradeScore } from '../../api/types'

afterEach(cleanup)
const names = { '3': 'Strong Opponent', '5': 'Weak Opponent', '7': 'Our Team', '8': 'Rival Team' }
const view = (score: TradeScore, teamNames: Record<string, string> | undefined = names) =>
  render(<MantineProvider><TradeScoreBreakdown score={score} teamNames={teamNames} /></MantineProvider>)
const term = (name: RegExp) => within(screen.getByRole('table', { name: 'Score terms' })).getByRole('row', { name })
const week = (n: number) => within(screen.getByRole('table', { name: 'Weekly score evidence' })).getByRole('row', { name: `Week ${n}` })

it('shows every term exactly as core returned it, without recomputing the final score', () => {
  const score = completeScore()
  // Deliberately inconsistent with G* + C*: the page must show core's value, not its own sum.
  score.score.final_score = 99.94
  view(score)
  expect(screen.getAllByText('+99.9')).toHaveLength(2)
  expect(within(term(/Raw VORP received/)).getByText('7.8')).toBeTruthy()
  expect(within(term(/Raw VORP sent/)).getByText('4.3')).toBeTruthy()
  expect(within(term(/Raw VORP net/)).getByText('+3.5')).toBeTruthy()
  expect(within(term(/Our lineup gain/)).getByText('+12.6')).toBeTruthy()
  expect(within(term(/Our weighted gain/)).getByText('+13.8')).toBeTruthy()
  expect(within(term(/Our schedule adjustment/)).getByText('+1.2')).toBeTruthy()
  expect(within(term(/Counterparty lineup change/)).getByText('-4.4')).toBeTruthy()
  expect(within(term(/Counterparty weighted benefit/)).getByText('+2.1')).toBeTruthy()
  expect(within(term(/Final score/)).getByText('+99.9')).toBeTruthy()
  expect(screen.getByText(/Strength weight 0.25 · z clamp ±2 · indirect factor 0.25/)).toBeTruthy()
})

it('keeps our gain separate from the counterparty impact and labels raw VORP as single-week', () => {
  view(completeScore())
  expect(within(term(/Our lineup gain/)).getByText(/Our Team/)).toBeTruthy()
  expect(within(term(/Counterparty lineup change/)).getByText(/Rival Team/)).toBeTruthy()
  expect(within(term(/Raw VORP net/)).getByText(/week 5 only/i)).toBeTruthy()
})

it('explains a complete horizon', () => {
  view(completeScore())
  expect(screen.getByText('Weeks 5–8 · 4 of 4 scored')).toBeTruthy()
  expect(screen.queryByText('Partial horizon')).toBeNull()
  expect(screen.getByText('trade-score-v1')).toBeTruthy()
})

it('flags a partial horizon and lists unscored weeks with reasons and no numbers', () => {
  view(partialScore())
  expect(screen.getByText('Weeks 5–8 · 2 of 4 scored')).toBeTruthy()
  expect(screen.getByText('Partial horizon')).toBeTruthy()
  expect(screen.getByText('Totals cover weeks 5, 6 only.')).toBeTruthy()
  expect(within(week(7)).getByText(/No metrics for this week/)).toBeTruthy()
  expect(within(week(8)).getByText(/Lineup could not be filled/)).toBeTruthy()
  expect(within(week(8)).getByText(/Unrecognized reason \(brand_new_reason\)/)).toBeTruthy()
  for (const n of [7, 8]) expect(within(week(n)).queryByText(/\d+\.\d/)).toBeNull()
})

it('withholds the final score with mapped reasons while still showing returned terms', () => {
  view(partialScore())
  expect(screen.getByText('Score unavailable')).toBeTruthy()
  expect(screen.getAllByText(/Counterparty's fantasy opponent strength unknown/).length).toBeGreaterThan(0)
  expect(within(term(/Our lineup gain/)).getByText('+6.3')).toBeTruthy()
  expect(within(term(/Our weighted gain/)).getByText('+7.1')).toBeTruthy()
  expect(within(term(/Counterparty weighted benefit/)).getByText('Not available')).toBeTruthy()
  expect(within(term(/Final score/)).getByText('Not available')).toBeTruthy()
})

it('never shows zero when no week could be scored', () => {
  view(unscoredScore())
  expect(screen.getByText('Score unavailable')).toBeTruthy()
  expect(screen.getAllByText(/No scored weeks/).length).toBeGreaterThan(0)
  expect(screen.getByText('No week in the horizon was scored.')).toBeTruthy()
  for (const name of [/Our lineup gain/, /Our weighted gain/, /Our schedule adjustment/,
    /Counterparty lineup change/, /Counterparty weighted benefit/, /Final score/]) {
    expect(within(term(name)).getByText('Not available')).toBeTruthy()
    expect(term(name).textContent).not.toMatch(/\d\.\d/)
  }
  for (const n of [5, 6, 7, 8]) expect(within(week(n)).getByText(/Traded player metrics missing/)).toBeTruthy()
})

it('shows fantasy opponents, byes, unavailable pairings and head-to-head weeks distinctly', () => {
  view(partialScore())
  expect(within(week(5)).getByText(/Strong Opponent/)).toBeTruthy()
  expect(within(week(5)).getByText(/1\.37 z/)).toBeTruthy()
  expect(within(week(5)).getByText('×1.34')).toBeTruthy()
  expect(within(week(6)).getByText('Head-to-head')).toBeTruthy()
  expect(within(week(5)).getByText(/Pairing unavailable/)).toBeTruthy()
  expect(within(week(5)).getAllByText('Unknown')).toHaveLength(1)
  expect(within(week(6)).getByText('Us')).toBeTruthy()
  cleanup()
  view(completeScore())
  expect(within(week(7)).getByText(/Fantasy bye/)).toBeTruthy()
  expect(within(week(7)).getByText('×0.00')).toBeTruthy()
})

it('falls back to team ids when names are unavailable', () => {
  view(completeScore(), {})
  expect(within(week(5)).getByText(/Team 3/)).toBeTruthy()
})

it('explains each scored week from returned lineups', () => {
  view(completeScore())
  const details = screen.getByRole('group', { name: 'Week 8 lineup changes' })
  expect(within(details).getAllByText(/Enters: Received Wideout \(WR, 7\.8 VORP\)/).length).toBe(1)
  expect(within(details).getAllByText(/Leaves: Sent Back \(RB, 4\.3 VORP\)/).length).toBe(1)
  expect(within(details).getByText(/Lineup VORP 50\.0 → 53\.0/)).toBeTruthy()
  expect(within(details).getByText(/Held without metrics: K/)).toBeTruthy()
  expect(within(details).getByText(/ESPN player 400: NFL bye/)).toBeTruthy()
})

it('reports coverage gaps, roster-limit problems and provenance', () => {
  view(partialScore())
  const coverage = screen.getByRole('region', { name: 'Score coverage' })
  expect(within(coverage).getByText(/without a player mapping: ESPN player -16002/)).toBeTruthy()
  expect(within(coverage).getByText(/missing metrics or mapping in weeks 6/)).toBeTruthy()
  expect(within(coverage).getByText(/NFL schedule unavailable for weeks 8/)).toBeTruthy()
  expect(within(coverage).getByText(/No VORP data for 1 player\(s\).*excluded from raw VORP/)).toBeTruthy()
  expect(within(coverage).getByText(/Rival Team would have 17 rostered players, over the 16-player limit/)).toBeTruthy()
  expect(within(coverage).getByText(/does not reconstruct that week's roster/)).toBeTruthy()
  expect(within(coverage).getByText(/Observed ESPN week 6/)).toBeTruthy()
  expect(within(coverage).getByText(/Stored ESPN scoring weeks · 10 teams with observed strength/)).toBeTruthy()
})

it('says when no coverage gaps were reported', () => {
  view(completeScore())
  expect(screen.getByText('No coverage gaps reported.')).toBeTruthy()
})
