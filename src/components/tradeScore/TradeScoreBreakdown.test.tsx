import { afterEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
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

it('shows every term exactly as core returned it, without recomputing the final score', async () => {
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
  fireEvent.focus(screen.getByRole('button', { name: 'What is our weight?' }))
  expect((await screen.findByRole('tooltip')).textContent).toMatch(/Strength weight 0.25 · z clamp ±2/)
})

it('explains score terms on demand and labels raw VORP as single-week', async () => {
  view(completeScore())
  fireEvent.focus(within(term(/Our lineup gain/)).getByRole('button'))
  expect((await screen.findByRole('tooltip')).textContent).toMatch(/best possible starting lineup/)
  fireEvent.blur(within(term(/Our lineup gain/)).getByRole('button'))
  fireEvent.focus(within(term(/Counterparty lineup change/)).getByRole('button'))
  expect((await screen.findByText(/Change in the other team's best starting lineup/)).textContent).toMatch(/other team's best starting lineup/)
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
  expect(within(week(5)).getByText(/Strength ▲ \+1\.4 strong/)).toBeTruthy()
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

it('shows raw VORP as not available when a side has no counted players, never as zero', () => {
  const score = completeScore()
  score.raw_vorp = { ...score.raw_vorp, incoming_total: 0, delta_vorp: -4.25, missing_player_ids: ['p200'] }
  view(score)
  expect(within(term(/Raw VORP received/)).getByText('Not available')).toBeTruthy()
  expect(within(term(/Raw VORP net/)).getByText('Not available')).toBeTruthy()
  expect(within(term(/Raw VORP sent/)).getByText('4.3')).toBeTruthy()
  for (const name of [/Raw VORP received/, /Raw VORP net/]) expect(term(name).textContent).not.toMatch(/0\.0|-4\.3/)
})

it('treats an unmapped traded player as uncounted in raw VORP', () => {
  const score = completeScore()
  score.send = [{ ...score.send[0], player_id: null }]
  score.raw_vorp = { ...score.raw_vorp, outgoing_total: 0, delta_vorp: 7.75, unmapped_espn_ids: ['100'] }
  view(score)
  expect(within(term(/Raw VORP sent/)).getByText('Not available')).toBeTruthy()
  expect(within(term(/Raw VORP net/)).getByText('Not available')).toBeTruthy()
})

it('marks raw VORP totals that leave out some players as incomplete', () => {
  const score = completeScore()
  score.receive = [...score.receive, { espn_id: '201', player_id: 'p201', name: 'Second Wideout', position: 'WR', nfl_team: 'SF' }]
  score.raw_vorp = { ...score.raw_vorp, missing_player_ids: ['p201'] }
  view(score)
  expect(within(term(/Raw VORP received/)).getByText('7.8 (incomplete)')).toBeTruthy()
  expect(within(term(/Raw VORP sent/)).getByText('4.3')).toBeTruthy()
  expect(within(term(/Raw VORP net/)).getByText('+3.5 (incomplete)')).toBeTruthy()
})

it('keeps an exact empty side and does not flag the net for gaps outside the traded players', () => {
  const score = completeScore()
  score.send = []
  score.raw_vorp = { ...score.raw_vorp, outgoing_total: 0, delta_vorp: 7.75, missing_player_ids: ['p999'], unmapped_espn_ids: ['-16002'] }
  view(score)
  expect(within(term(/Raw VORP sent/)).getByText('0.0')).toBeTruthy()
  expect(within(term(/Raw VORP received/)).getByText('7.8')).toBeTruthy()
  expect(within(term(/Raw VORP net/)).getByText('+7.8')).toBeTruthy()
})

it('says which bye crunch weeks the trade fixes or opens for each side', () => {
  const score = completeScore()
  score.bye_coverage = {
    us: { crunch_weeks_before: [8], crunch_weeks_after: [], fixed: [8], created: [] },
    counterparty: { crunch_weeks_before: [], crunch_weeks_after: [9], fixed: [], created: [9] },
  }
  view(score)
  const section = screen.getByRole('region', { name: 'Bye coverage' })
  expect(within(section).getByText('Covers our bye crunch')).toBeTruthy()
  expect(within(section).getByText('Our Team: covers the bye crunch in week 8.')).toBeTruthy()
  expect(within(section).getByText('Rival Team: opens a bye crunch in week 9.')).toBeTruthy()
})

it('omits bye coverage when core did not report it', () => {
  view(completeScore())
  expect(screen.queryByRole('region', { name: 'Bye coverage' })).toBeNull()
})
