import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter } from 'react-router-dom'
import { queryClient } from '../../api/queryClient'
import { SentTradesReview } from './SentTradesReview'
import { sentConfig, sentFixture, sentFixtures, sentNames, answeredFixture } from './fixtures'
import { completeScore } from '../tradeScore/fixtures'
import type { SentTrade } from '../../api/sentTrades'

const calls: Record<string, unknown>[] = []
function scoring(response = completeScore()) {
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
    calls.push(JSON.parse(String(init.body)))
    return new Response(JSON.stringify(response))
  }))
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); calls.length = 0 })
function view(trades: SentTrade[] = sentFixtures(), week: number | null = 6) {
  return <MantineProvider><MemoryRouter><SentTradesReview trades={trades} names={sentNames} config={sentConfig} week={week} /></MemoryRouter></MantineProvider>
}
it('filters with global counts, selects within the filter, and clears detail for an empty filter', async () => {
  scoring()
  render(view())
  expect(screen.getByRole('button', { name: 'All 5' }).getAttribute('aria-pressed')).toBe('true')
  fireEvent.click(screen.getByRole('button', { name: 'Accepted 1' }))
  expect(screen.getByRole('article').textContent).toContain('Waiver Wire Warriors')
  expect(screen.getAllByRole('button', { name: /Get Chase Brown/ })).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: 'Declined 1' }))
  expect(screen.getByRole('article').textContent).toContain('Hail Mary Club')
  cleanup()
  render(view([sentFixture()]))
  fireEvent.click(screen.getByRole('button', { name: 'Accepted 0' }))
  expect(screen.queryByRole('article')).toBeNull()
  expect(screen.getByText('No accepted offers.')).toBeTruthy()
})
it('shows the exact edited text, distinct editor and approver, and resets the draft on selection', async () => {
  scoring()
  render(view([sentFixture({ edited_by: 'Editor' }), answeredFixture('accepted', 3)]))
  const detail = screen.getByRole('article')
  expect(within(detail).getByText('Edited by Editor')).toBeTruthy()
  expect(detail.textContent).toContain('by Conor')
  const toggle = within(detail).getByRole('button', { name: 'Show the generated draft' })
  expect(toggle.getAttribute('aria-expanded')).toBe('false')
  fireEvent.click(toggle)
  expect(within(detail).getByText('You are thin at WR and deep at RB. This improves both starting lineups.')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: /Waiver Wire Warriors.*Get/ }))
  expect(screen.queryByText('You are thin at WR and deep at RB. This improves both starting lineups.')).toBeNull()
  expect(screen.queryByRole('button', { name: /generated draft/ })).toBeNull()
})
it('scores only the open pending offer with current week, saved horizon and exact player sides', async () => {
  scoring()
  render(view())
  await waitFor(() => expect(calls).toHaveLength(1))
  expect(calls[0]).toEqual({ league_id: '123', season: 2026, week: 6, horizon: 4, our_team_id: '7', counterparty_team_id: '8', send_espn_ids: ['100'], receive_espn_ids: ['200'] })
  const detail = screen.getByRole('article')
  expect(within(detail).getByRole('button', { name: 'Withdraw offer' }).hasAttribute('disabled')).toBe(true)
  expect(within(detail).getByRole('link', { name: 'View on ESPN' }).getAttribute('href')).toContain('leagueId=123')
  fireEvent.click(screen.getByRole('button', { name: 'Accepted 1' }))
  await waitFor(() => expect(screen.getByRole('article').textContent).toContain('Finished offer'))
  expect(calls).toHaveLength(1)
  expect(screen.queryByRole('button', { name: 'Withdraw offer' })).toBeNull()
})
it('does not rescore finished, blocked, conflicting or missing-week offers', async () => {
  scoring()
  const trades = [answeredFixture('accepted', 3), sentFixture({ status: 'submit_blocked' }), sentFixture({ status: 'failure' }), { ...sentFixture(), conflict: true }]
  for (const trade of trades) {
    render(view([trade])); await new Promise(resolve => setTimeout(resolve, 0)); cleanup()
  }
  render(view([sentFixture()], null))
  expect(screen.getByText(/Current league week is unavailable/)).toBeTruthy()
  expect(calls).toHaveLength(0)
})
it('does not show a score for a different selection when an earlier request finishes late', async () => {
  let finish: (response: Response) => void = () => {}
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { finish = resolve })))
  render(view())
  fireEvent.click(screen.getByRole('button', { name: 'Not sent 1' }))
  finish(new Response(JSON.stringify(completeScore())))
  await waitFor(() => expect(screen.getByRole('article').textContent).toContain('Bye Week Bandits'))
  const tiles = screen.getByLabelText('Review scores')
  expect(tiles.textContent).not.toContain('Scoring window moved')
  expect(screen.getByRole('article').textContent).toContain('Worker submission gates blocked')
})
it('shows live score failure separately from the stored evidence and allows retry', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Scorer unavailable')))
  render(view([sentFixture()]))
  expect(await screen.findByText(/Could not score this offer now/)).toBeTruthy()
  expect(screen.getByLabelText('Review scores').textContent).toContain('+15.9')
  expect(screen.getByLabelText('Review scores').textContent).toContain('Not available')
  scoring()
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await waitFor(() => expect(screen.queryByText(/Could not score this offer now/)).toBeNull())
})
it('labels unavailable approval evidence and preserves signed C* with a single glossary tooltip', async () => {
  const score = completeScore(); score.score.counterparty_weighted_benefit = -0.2
  scoring(score)
  render(view([sentFixture()]))
  expect(await screen.findByText('-0.2')).toBeTruthy()
  expect(screen.getByText(/approval-time re-score not recorded/)).toBeTruthy()
  fireEvent.focus(screen.getByRole('button', { name: 'What is cost of helping them?' }))
  expect((await screen.findByRole('tooltip')).textContent).toBe("Their lineup gain turned into a penalty on our score. It's weighted heavily in weeks we face them and lightly (×0.25) otherwise. Usually a small negative number.")
})
it('does not invent a draft, score or player name when optional evidence is absent', () => {
  render(view([sentFixture({ status: 'submit_blocked', evaluation: null, drafted_message: null, incoming_players: [{ espn_id: '200', name: null }] })]))
  expect(screen.getByRole('article').textContent).toContain('ESPN player 200')
  expect(screen.getByText('Generated draft not recorded.')).toBeTruthy()
  expect(screen.getByLabelText('Review scores').textContent).not.toMatch(/\+\d/)
})
it.each([
  ['approved', 'Queued for ESPN'], ['approval_pending', 'Publication unconfirmed'], ['submitting', 'Submission unconfirmed'], ['submitted', 'Their answer'], ['submit_blocked', 'Not sent'], ['failure', 'Not sent'],
])('renders the %s timeline', (status, title) => {
  scoring()
  render(view([sentFixture({ status })]))
  const timeline = screen.getByRole('list', { name: 'What happened' })
  expect(within(timeline).getByText(title)).toBeTruthy()
})

it('shows the approved text without claiming ESPN attached it', () => {
  scoring()
  render(view([sentFixture()]))
  expect(screen.getByRole('heading', { name: 'Approved message' })).toBeTruthy()
  expect(screen.getByText(/ESPN message delivery is not recorded/)).toBeTruthy()
})

it('hides a previous live score when a status refresh cannot rescore it', async () => {
  const score = completeScore(); score.score.final_score = 9.4
  scoring(score)
  render(view([sentFixture()]))
  expect(await screen.findByText('+9.4')).toBeTruthy()
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Refresh failed')))
  await act(async () => { await queryClient.invalidateQueries({ queryKey: ['sent-trade-score'] }) })
  expect(await screen.findByText(/Could not score this offer now/)).toBeTruthy()
  expect(screen.queryByText('+9.4')).toBeNull()
})
