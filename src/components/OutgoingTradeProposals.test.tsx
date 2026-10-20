import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { getTradeProposalStates } from '../api/tradeApproval'
import { getOutgoingTradeOffers, getTeamNames, scoreTrade } from '../api/client'
import { OutgoingTradeProposals } from './OutgoingTradeProposals'
import type { DraftConfig, TradeOffer } from '../api/types'
import { partialScore, proposalEvaluation } from './tradeScore/fixtures'

vi.mock('../api/tradeApproval', async importOriginal => ({ ...await importOriginal<typeof import('../api/tradeApproval')>(), getTradeProposalStates: vi.fn().mockResolvedValue([]), approveTradeOffer: vi.fn() }))
vi.mock('../api/client', () => ({ getOutgoingTradeOffers: vi.fn(), getTeamNames: vi.fn(), scoreTrade: vi.fn() }))
const config: DraftConfig = { league_id: '123', team_id: '7', season: 2026, mode: 'live' }
const offer: TradeOffer = {
  id: 1, status: 'awaiting_approval', league_id: '123', season: 2026,
  source: 'proposal', from_team_id: '7', to_team_id: '8',
  incoming_player_ids: ['4046'], outgoing_player_ids: ['9999'],
  incoming_players: [{ espn_id: '4046', name: 'Some Back' }],
  outgoing_players: [{ espn_id: '9999', name: null }],
  executed_at: '2026-10-05T13:00:00Z', message: 'Improve our receiving depth.',
}
beforeEach(() => {
  vi.mocked(getTradeProposalStates).mockResolvedValue([])
  vi.mocked(getTeamNames).mockResolvedValue({ '8': 'Rival Team' })
  vi.mocked(getOutgoingTradeOffers).mockResolvedValue([offer])
})
afterEach(() => { cleanup(); vi.resetAllMocks() })
const view = (scope = config) => <MantineProvider><OutgoingTradeProposals config={scope} /></MantineProvider>

it('shows a busy skeleton until proposals arrive', () => {
  vi.mocked(getOutgoingTradeOffers).mockReturnValue(new Promise(() => {}))
  const { container } = render(view())
  expect(screen.getByRole('status', { name: 'Loading outgoing trade proposals' })).toBeTruthy()
  expect(container.querySelector('[aria-busy="true"]')).toBeTruthy()
  expect(screen.queryByText(/No outgoing proposals/)).toBeNull()
})

it('shows the counterparty, sides, pitch and pending status with ESPN-id fallbacks', async () => {
  render(view())
  expect(await screen.findByText('Rival Team')).toBeTruthy()
  expect(screen.getByText('Some Back')).toBeTruthy()
  expect(screen.getByText('ESPN player 9999')).toBeTruthy()
  expect(screen.getByText('You receive')).toBeTruthy()
  expect(screen.getByText('You send')).toBeTruthy()
  expect(screen.getByText('Improve our receiving depth.')).toBeTruthy()
  expect(screen.getByText('Awaiting approval')).toBeTruthy()
  expect(document.querySelector('time')?.getAttribute('datetime')).toBe(offer.executed_at)
  expect(getOutgoingTradeOffers).toHaveBeenCalledWith(config)
  expect(getTeamNames).toHaveBeenCalledWith('123')
  expect(screen.queryByRole('button', { name: /approve|send/i })).toBeNull()
})

it('scrolls to and outlines the proposal a notification linked to', async () => {
  const scrollIntoView = vi.fn()
  Element.prototype.scrollIntoView = scrollIntoView
  const other = { ...offer, id: 2, offer_key: 'other-key', to_team_id: '9' }
  vi.mocked(getOutgoingTradeOffers).mockResolvedValue([{ ...offer, offer_key: 'linked-key' }, other])
  render(<MantineProvider><OutgoingTradeProposals config={config} linkedOfferKey="linked-key" /></MantineProvider>)
  const card = (await screen.findByText('Rival Team')).closest('article')
  expect(card?.getAttribute('aria-current')).toBe('true')
  expect(document.querySelectorAll('article[aria-current]')).toHaveLength(1)
  expect(scrollIntoView).toHaveBeenCalledTimes(1)
})

it('shows a useful empty state without promising a proposal every scan', async () => {
  vi.mocked(getOutgoingTradeOffers).mockResolvedValue([])
  render(view())
  expect(await screen.findByText('No outgoing proposals awaiting approval.')).toBeTruthy()
})

it('allows retrying a failed read and keeps the error out of the empty state', async () => {
  vi.mocked(getOutgoingTradeOffers).mockRejectedValue(new Error('Offers unavailable'))
  render(view())
  expect(await screen.findByText(/Could not load outgoing proposals/)).toBeTruthy()
  expect(screen.queryByText('No outgoing proposals awaiting approval.')).toBeNull()
  expect(getOutgoingTradeOffers).toHaveBeenCalledOnce()
  vi.mocked(getOutgoingTradeOffers).mockResolvedValue([offer])
  fireEvent.click(screen.getByRole('button', { name: 'Refresh proposals' }))
  expect(await screen.findByText('Some Back')).toBeTruthy()
})

it('uses team-id and missing-pitch fallbacks if optional enrichment is unavailable', async () => {
  vi.mocked(getTeamNames).mockRejectedValue(new Error('Names unavailable'))
  vi.mocked(getOutgoingTradeOffers).mockResolvedValue([{ ...offer, message: null }])
  render(view())
  expect(await screen.findByText('Team 8')).toBeTruthy()
  expect(screen.getByText('No explanation provided.')).toBeTruthy()
})

it.each([
  { league_id: '456' }, { team_id: '9' }, { season: 2025 },
])('replaces proposals when configuration changes: %j', async (change) => {
  const { rerender } = render(view())
  await screen.findByText('Some Back')
  const next = { ...config, ...change }
  vi.mocked(getOutgoingTradeOffers).mockReturnValue(new Promise(() => {}))
  rerender(view(next))
  await waitFor(() => expect(getOutgoingTradeOffers).toHaveBeenCalledWith(next))
  expect(screen.queryByText('Some Back')).toBeNull()
  expect(screen.getByRole('status', { name: 'Loading outgoing trade proposals' })).toBeTruthy()
})

it('refreshes pending offers on demand', async () => {
  render(view())
  await screen.findByText('Some Back')
  vi.mocked(getOutgoingTradeOffers).mockResolvedValue([])
  fireEvent.click(screen.getByRole('button', { name: 'Refresh proposals' }))
  expect(await screen.findByText('No outgoing proposals awaiting approval.')).toBeTruthy()
})


it('warns when refresh fails while retaining the previously loaded proposals', async () => {
  render(view())
  await screen.findByText('Some Back')
  vi.mocked(getOutgoingTradeOffers).mockRejectedValue(new Error('Refresh unavailable'))
  fireEvent.click(screen.getByRole('button', { name: 'Refresh proposals' }))
  expect(await screen.findByText(/Previously loaded proposals.*out of date/)).toBeTruthy()
  expect(screen.getByText('Some Back')).toBeTruthy()
})

it('shows stored score evidence on a generated proposal and expands to the full breakdown', async () => {
  vi.mocked(getOutgoingTradeOffers).mockResolvedValue([{ ...offer, evaluation: proposalEvaluation() }])
  render(view())
  const summary = await screen.findByRole('region', { name: 'Proposal score' })
  expect(within(summary).getAllByText('+15.9').length).toBeGreaterThan(0)
  expect(within(summary).getAllByText('Weeks 5–8 · 4 of 4 scored').length).toBeGreaterThan(0)
  expect(within(summary).getByText(/Scored for week 5 with a 4-week horizon/)).toBeTruthy()
  expect(within(summary).getByText(/Ranked 1 of 2 eligible packages by final score/)).toBeTruthy()
  const breakdown = within(summary).getByRole('group', { name: 'Score breakdown' })
  expect(within(breakdown).getByRole('table', { name: 'Score terms' })).toBeTruthy()
  expect(scoreTrade).not.toHaveBeenCalled()
})

it('grounds the pitch in the stored evidence it cites', async () => {
  vi.mocked(getOutgoingTradeOffers).mockResolvedValue([{ ...offer, evaluation: proposalEvaluation() }])
  render(view())
  const evidence = await screen.findByRole('list', { name: 'Pitch evidence' })
  const cited = within(evidence).getByText(/Your week 5 lineup changes by -1.1/).closest('li')!
  expect(within(cited).getByText('Cited in pitch')).toBeTruthy()
  expect(within(cited).getByText(/roster_impact\/counterparty\/weeks\/0\/delta = -1.1/)).toBeTruthy()
  const uncited = within(evidence).getByText(/We play each other in week 6/).closest('li')!
  expect(within(uncited).queryByText('Cited in pitch')).toBeNull()
  expect(within(uncited).getByText(/head_to_head = yes/)).toBeTruthy()
})

it('flags pitch evidence that does not resolve and a pitch that differs from the offer', async () => {
  const evaluation = proposalEvaluation()
  evaluation.pitch!.evidence[0].path = '/score/nope'
  evaluation.pitch!.message = 'A different pitch'
  vi.mocked(getOutgoingTradeOffers).mockResolvedValue([{ ...offer, evaluation }])
  render(view())
  expect(await screen.findByText(/not found in the stored score/)).toBeTruthy()
  expect(screen.getByText(/stored pitch differs from this offer's message/)).toBeTruthy()
})

it('shows our gain, counterparty change and schedule adjustment without expanding the breakdown', async () => {
  vi.mocked(getOutgoingTradeOffers).mockResolvedValue([{ ...offer, evaluation: proposalEvaluation() }])
  render(view())
  const terms = await screen.findByLabelText('Score terms summary')
  expect(within(terms).getByText('+12.6')).toBeTruthy()
  expect(within(terms).getByText('+1.2')).toBeTruthy()
  expect(within(terms).getByText('+2.1')).toBeTruthy()
  expect(within(terms).getByText('Schedule boost')).toBeTruthy()
  expect(within(terms).getByText('Their benefit')).toBeTruthy()
  expect(screen.getByLabelText('Counterparty lineup change').textContent).toMatch(/-4\.4 \(negative means the trade weakens them\)/)
})

it('shows our lineup gain on a proposal ranked by it when the final score is withheld', async () => {
  const evaluation = proposalEvaluation(partialScore())
  evaluation.ranking!.basis = 'our_lineup_gain'
  vi.mocked(getOutgoingTradeOffers).mockResolvedValue([{ ...offer, evaluation }])
  render(view())
  const terms = await screen.findByLabelText('Score terms summary')
  expect(within(terms).getByText('+6.3')).toBeTruthy()
  expect(within(terms).getByText('+0.8')).toBeTruthy()
  expect(within(terms).getByText('Unavailable')).toBeTruthy()
})

it('shows an unavailable stored score with its reasons rather than zero', async () => {
  vi.mocked(getOutgoingTradeOffers).mockResolvedValue([{ ...offer, evaluation: proposalEvaluation(partialScore()) }])
  render(view())
  const summary = await screen.findByRole('region', { name: 'Proposal score' })
  expect(within(summary).getAllByText('Score unavailable').length).toBeGreaterThan(0)
  expect(within(summary).getAllByText('Partial horizon').length).toBeGreaterThan(0)
})

it('says a proposal the generator stored no evidence for is not scored, never zero', async () => {
  vi.mocked(getOutgoingTradeOffers).mockResolvedValue([{ ...offer, evaluation: null }])
  render(view())
  const summary = await screen.findByRole('region', { name: 'Proposal score' })
  expect(within(summary).getByText('No score evidence was stored for this proposal.')).toBeTruthy()
  expect(summary.textContent).not.toMatch(/\d\.\d/)
  expect(scoreTrade).not.toHaveBeenCalled()
})

it('does not claim evidence is missing when the API omits the evaluation field', async () => {
  vi.mocked(getOutgoingTradeOffers).mockResolvedValue([offer])
  render(view())
  const summary = await screen.findByRole('region', { name: 'Proposal score' })
  expect(within(summary).getByText(/isn't available from the API/)).toBeTruthy()
  expect(within(summary).queryByText(/No score evidence was stored/)).toBeNull()
  expect(summary.textContent).not.toMatch(/\d\.\d/)
  expect(scoreTrade).not.toHaveBeenCalled()
})

it('does not misread stored evidence in an unrecognized format', async () => {
  const evaluation = { ...proposalEvaluation(), version: 'proposal-evaluation-v2' } as unknown as TradeOffer['evaluation']
  vi.mocked(getOutgoingTradeOffers).mockResolvedValue([{ ...offer, evaluation }])
  render(view())
  const summary = await screen.findByRole('region', { name: 'Proposal score' })
  expect(within(summary).getByText(/format this page does not recognize/)).toBeTruthy()
  expect(within(summary).queryByRole('table')).toBeNull()
})

it('shows cited players, starters and unscored weeks readably instead of as raw JSON', async () => {
  const evaluation = proposalEvaluation(partialScore())
  evaluation.pitch!.evidence = [
    { id: 'e1', path: '/send/0', text: 'You would receive Sent Back' },
    { id: 'e2', path: '/roster_impact/counterparty/weeks/0/starters_after/0', text: 'Sent Back would start for you in week 5' },
    { id: 'e3', path: '/horizon/unscored_weeks/0', text: 'Week 7 could not be evaluated' },
  ]
  vi.mocked(getOutgoingTradeOffers).mockResolvedValue([{ ...offer, evaluation }])
  render(view())
  const evidence = await screen.findByRole('list', { name: 'Pitch evidence' })
  expect(within(evidence).getByText('Score field: /send/0 = Sent Back (RB, KC)')).toBeTruthy()
  expect(within(evidence).getByText(/starters_after\/0 = Sent Back \(RB, 4\.3 VORP\)/)).toBeTruthy()
  expect(within(evidence).getByText(/unscored_weeks\/0 = Week 7 not scored: No metrics for this week/)).toBeTruthy()
  expect(evidence.textContent).not.toMatch(/[{}]/)
})
