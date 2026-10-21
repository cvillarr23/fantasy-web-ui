import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { queryClient } from '../api/queryClient'
import { proposalEvaluation } from './tradeScore/fixtures'
import { ApiError, scoreTrade } from '../api/client'
import { approveTradeOffer, getTradeProposalStates } from '../api/tradeApproval'
import type { DraftConfig, TradeOffer } from '../api/types'
import { TradeOfferApproval, TradeApprovalStatus } from './TradeOfferApproval'
vi.mock('../api/client', async importOriginal => ({ ...await importOriginal<typeof import('../api/client')>(), scoreTrade: vi.fn() }))
vi.mock('../api/tradeApproval', async importOriginal => ({ ...await importOriginal<typeof import('../api/tradeApproval')>(), approveTradeOffer: vi.fn(), getTradeProposalStates: vi.fn() }))
const config: DraftConfig = { league_id: '123', team_id: '7', season: 2026, mode: 'live' }
const offer: TradeOffer = { id: 1, status: 'awaiting_approval', offer_key: 'a'.repeat(64), league_id: '123', season: 2026, source: 'proposal', from_team_id: '7', to_team_id: '8', incoming_player_ids: ['4046'], outgoing_player_ids: ['9999'], incoming_players: [{ espn_id: '4046', name: 'Some Back' }], outgoing_players: [{ espn_id: '9999', name: null }], executed_at: '2026-10-05T10:00:00Z', message: '  Exact pitch\n第二行  ' }
const approved = { offer_key: offer.offer_key!, status: 'approved' as const, tracking_id: 'track', approved_by: 'Manager', approved_at: '2026-10-06T10:00:00Z', duplicate: false }
const view = (scope = config, proposal = offer) => <MantineProvider><TradeOfferApproval config={scope} offer={proposal} counterparty="Rival" disabled={false} /><TradeApprovalStatus config={scope} /></MantineProvider>
beforeEach(() => { sessionStorage.clear(); vi.mocked(getTradeProposalStates).mockResolvedValue([offer]); vi.mocked(approveTradeOffer).mockResolvedValue(approved) })
afterEach(() => { cleanup(); vi.resetAllMocks() })
async function review() {
  await waitFor(() => expect((screen.getByRole('button', { name: 'Review approval' }) as HTMLButtonElement).disabled).toBe(false))
  fireEvent.click(screen.getByRole('button', { name: 'Review approval' }))
  await screen.findByText("Approving queues this exact offer for the browser worker to send on ESPN. You can't edit it after you approve. If either roster has changed by then, the worker re-checks and stops.")
  await waitFor(() => expect(screen.queryByText('Verifying current offer…')).toBeNull())
}
function confirm(label = 'Manager') {
  fireEvent.change(screen.getByLabelText('Approver name'), { target: { value: label } })
  fireEvent.click(screen.getByLabelText("I've checked the players, the score and the message"))
  fireEvent.click(screen.getByRole('button', { name: 'Approve and queue offer' }))
}
it('requires exact review, a label and explicit confirmation; cancel sends nothing', async () => {
  render(view()); await review()
  expect(screen.getByText('Rival (Team 8)')).toBeTruthy()
  expect(screen.getByText('Some Back (ESPN 4046)')).toBeTruthy()
  expect(screen.getByText('ESPN player 9999')).toBeTruthy()
  expect(screen.getByTestId('approval-pitch').textContent).toBe(offer.message)
  expect((screen.getByRole('button', { name: 'Approve and queue offer' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(approveTradeOffer).not.toHaveBeenCalled()
})
it.each([' ', 'x'.repeat(201)])('blocks invalid approver label', async label => {
  render(view()); await review(); confirm(label); expect(approveTradeOffer).not.toHaveBeenCalled()
})
it('guards repeat clicks and distinguishes queued from confirmed', async () => {
  let resolve!: (value: typeof approved) => void
  vi.mocked(approveTradeOffer).mockReturnValue(new Promise(r => { resolve = r }))
  render(view()); await review(); confirm(' Manager ')
  const button = screen.getByRole('button', { name: 'Requesting approval…' })
  fireEvent.click(button); fireEvent.click(button)
  await waitFor(() => expect(approveTradeOffer).toHaveBeenCalledOnce())
  expect(approveTradeOffer).toHaveBeenCalledWith(offer.offer_key, 'Manager')
  resolve(approved)
  expect(await screen.findByText('Offer queued. ESPN submission is not yet confirmed.')).toBeTruthy()
  expect(screen.queryByText('Worker confirmed submission to ESPN')).toBeNull()
})
it('shows the original audit for duplicate approval', async () => {
  vi.mocked(approveTradeOffer).mockResolvedValue({ ...approved, duplicate: true, approved_by: 'Original manager' })
  render(view()); await review(); confirm()
  expect(await screen.findByText('This offer was already approved; no additional offer was queued.')).toBeTruthy()
  expect(screen.getByText(/Original manager/)).toBeTruthy()
})
it.each([404, 409, 422, 503, 500, 403])('handles rejection %s without claiming submission', async status => {
  vi.mocked(approveTradeOffer).mockRejectedValue(new ApiError(status, 'Core reason'))
  render(view()); await review(); confirm()
  expect(await screen.findByText(/Core reason/)).toBeTruthy()
  expect(screen.queryByText('Worker confirmed submission to ESPN')).toBeNull()
  expect(approveTradeOffer).toHaveBeenCalledOnce()
})
it('retains an uncertain outcome through remount and never retries automatically', async () => {
  vi.mocked(approveTradeOffer).mockRejectedValue(new Error('Connection lost'))
  const { unmount } = render(view()); await review(); confirm()
  await screen.findByText(/Approval outcome is unknown/)
  unmount(); render(view())
  await screen.findByText(/Approval outcome is unknown/)
  expect((screen.getByRole('button', { name: 'Review approval' }) as HTMLButtonElement).disabled).toBe(true)
  expect(approveTradeOffer).toHaveBeenCalledOnce()
})
it('permits fresh review only after new explicit pre-publication failure evidence', async () => {
  vi.mocked(approveTradeOffer).mockRejectedValue(new ApiError(503, 'Publication failed'))
  render(view()); await review()
  vi.mocked(approveTradeOffer).mockImplementation(async () => {
    vi.mocked(getTradeProposalStates).mockResolvedValue([{ ...offer, approval: { tracking_id: 'new-attempt', publish_error: 'Failed before publication; approval may be retried.' } }])
    throw new ApiError(503, 'Publication failed')
  })
  confirm(); await screen.findByText(/Failed before publication; review again/)
  expect((screen.getByRole('button', { name: 'Review approval' }) as HTMLButtonElement).disabled).toBe(false)
})
it('does not release uncertainty using a previous pre-publication failure marker', async () => {
  const previous = { ...offer, approval: { tracking_id: 'old', publish_error: 'Failed before publication; approval may be retried.' } }
  vi.mocked(getTradeProposalStates).mockResolvedValue([previous])
  vi.mocked(approveTradeOffer).mockRejectedValue(new Error('Connection lost'))
  render(view(config, previous)); await review(); confirm()
  await screen.findByText(/Approval outcome is unknown/)
  expect((screen.getByRole('button', { name: 'Review approval' }) as HTMLButtonElement).disabled).toBe(true)
})
it('blocks approval when refreshed offer changes or conflicts with another state', async () => {
  vi.mocked(getTradeProposalStates).mockResolvedValueOnce([offer]).mockResolvedValue([{ ...offer, message: 'Edited' }, { ...offer, id: 2, status: 'approval_pending' }])
  render(view()); await review()
  expect(screen.getByText(/cannot be approved in its current state/)).toBeTruthy()
  confirm(); expect(approveTradeOffer).not.toHaveBeenCalled()
})
it('blocks approval when verification fails', async () => {
  vi.mocked(getTradeProposalStates).mockResolvedValueOnce([offer]).mockRejectedValue(new Error('Read failed'))
  render(view()); await review()
  expect(screen.getAllByText(/Could not verify/).length).toBeGreaterThan(0)
  confirm(); expect(approveTradeOffer).not.toHaveBeenCalled()
})
it.each([{ team_id: '9' }, { league_id: '456' }, { season: 2025 }, { mode: 'practice' as const }])('closes confirmation on config change %j', async change => {
  const { rerender } = render(view()); await review()
  rerender(view({ ...config, ...change }))
  await waitFor(() => expect(screen.queryByLabelText('Approver name')).toBeNull())
  expect(approveTradeOffer).not.toHaveBeenCalled()
})
it.each([['approved', 'Queued — ESPN submission unconfirmed'], ['approval_pending', 'Approval pending / publication outcome unconfirmed'], ['submitting', 'Worker processing — ESPN submission unconfirmed'], ['submitted', 'Worker confirmed submission to ESPN'], ['submit_blocked', 'Worker blocked submission'], ['dry_run_filled', 'Dry run — no live submission recorded'], ['failure', 'Worker reported failure — inspect outcome before retrying']])('renders %s independently from queue acceptance', async (status, copy) => {
  vi.mocked(getTradeProposalStates).mockResolvedValue([{ ...offer, status }])
  render(view()); expect(await screen.findByText(copy)).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Review approval' }) as HTMLButtonElement).disabled).toBe(true)
})
it('blocks a missing supplied key', async () => {
  render(view(config, { ...offer, offer_key: null }))
  expect((screen.getByRole('button', { name: 'Review approval' }) as HTMLButtonElement).disabled).toBe(true)
})
it('does not send after unmount while final verification is pending', async () => {
  const { unmount } = render(view()); await review()
  let resolve!: (value: TradeOffer[]) => void
  vi.mocked(getTradeProposalStates).mockReturnValue(new Promise(r => { resolve = r }))
  confirm(); unmount(); resolve([offer])
  await new Promise(resolve => setTimeout(resolve, 30))
  expect(approveTradeOffer).not.toHaveBeenCalled()
})
it('keeps a queue receipt visible when the proposal disappears and status refresh fails', async () => {
  const { rerender } = render(view()); await review(); confirm()
  await screen.findByText('Offer queued. ESPN submission is not yet confirmed.')
  vi.mocked(getTradeProposalStates).mockRejectedValue(new Error('Read unavailable'))
  rerender(<MantineProvider><TradeApprovalStatus config={config} /></MantineProvider>)
  fireEvent.click(screen.getByRole('button', { name: 'Refresh status' }))
  expect(await screen.findByText(/Could not verify the current outcome/)).toBeTruthy()
  expect(screen.getByText('Offer queued. ESPN submission is not yet confirmed.')).toBeTruthy()
})
it('does not publish when durable browser safety state cannot be saved', async () => {
  render(view()); await review()
  const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage unavailable') })
  confirm()
  await screen.findByText(/Storage unavailable/)
  expect(approveTradeOffer).not.toHaveBeenCalled()
  spy.mockRestore()
})
it('serializes duplicate controls for the same supplied key', async () => {
  render(<MantineProvider><TradeOfferApproval config={config} offer={offer} counterparty="Rival" disabled={false} /><TradeOfferApproval config={config} offer={{ ...offer, id: 2 }} counterparty="Rival" disabled={false} /><TradeApprovalStatus config={config} /></MantineProvider>)
  await waitFor(() => expect((screen.getAllByRole('button', { name: 'Review approval' })[0] as HTMLButtonElement).disabled).toBe(false))
  fireEvent.click(screen.getAllByRole('button', { name: 'Review approval' })[0])
  await screen.findByLabelText('Approver name')
  await waitFor(() => expect(screen.queryByText('Verifying current offer…')).toBeNull())
  confirm(); await screen.findByText('Offer queued. ESPN submission is not yet confirmed.')
  expect(screen.getAllByRole('button', { name: 'Review approval' }).every(button => (button as HTMLButtonElement).disabled)).toBe(true)
  expect(approveTradeOffer).toHaveBeenCalledOnce()
})
it('resolves an uncertain request using a recorded approval, without repeating POST', async () => {
  vi.mocked(approveTradeOffer).mockImplementation(async () => {
    vi.mocked(getTradeProposalStates).mockResolvedValue([{ ...offer, status: 'approved', approval: { tracking_id: 'track', approved_by: 'Manager', approved_at: approved.approved_at } }])
    throw new Error('Response lost')
  })
  render(view()); await review(); confirm()
  expect(await screen.findByText('Offer is recorded as queued. ESPN submission is not yet confirmed.')).toBeTruthy()
  await waitFor(() => expect(screen.queryByText(/Approval outcome is unknown/)).toBeNull())
  expect(approveTradeOffer).toHaveBeenCalledOnce()
})
it('requires a new review and confirmation for a safe retry', async () => {
  vi.mocked(approveTradeOffer).mockImplementationOnce(async () => {
    vi.mocked(getTradeProposalStates).mockResolvedValue([{ ...offer, approval: { tracking_id: 'failed-attempt', publish_error: 'Failed before publication; approval may be retried.' } }])
    throw new ApiError(503, 'Publication failed')
  }).mockResolvedValue(approved)
  render(view()); await review(); confirm()
  await screen.findByText(/Failed before publication; review again/)
  await review()
  expect((screen.getByRole('button', { name: 'Approve and queue offer' }) as HTMLButtonElement).disabled).toBe(true)
  confirm(); await screen.findByText('Offer queued. ESPN submission is not yet confirmed.')
  expect(approveTradeOffer).toHaveBeenCalledTimes(2)
})
it('does not send when the offer changes during final verification', async () => {
  render(view()); await review()
  vi.mocked(getTradeProposalStates).mockResolvedValue([])
  confirm(); await screen.findByText(/cannot be approved in its current state/)
  expect(approveTradeOffer).not.toHaveBeenCalled()
})
it('keeps a late approval response scoped to its original configuration', async () => {
  let resolve!: (value: typeof approved) => void
  vi.mocked(approveTradeOffer).mockReturnValue(new Promise(r => { resolve = r }))
  const { rerender } = render(view()); await review(); confirm()
  await waitFor(() => expect(approveTradeOffer).toHaveBeenCalledOnce())
  rerender(view({ ...config, team_id: '9' })); resolve(approved)
  await new Promise(resolve => setTimeout(resolve, 30))
  expect(screen.queryByText('Offer queued. ESPN submission is not yet confirmed.')).toBeNull()
  expect(screen.queryByLabelText('Approver name')).toBeNull()
  expect(approveTradeOffer).toHaveBeenCalledOnce()
})
it('retains the pre-request guard if storage fails while recording the response', async () => {
  render(view()); await review()
  const original = Storage.prototype.setItem
  let saves = 0
  const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
    if (++saves > 1) throw new Error('Storage became unavailable')
    original.call(this, key, value)
  })
  confirm()
  await waitFor(() => expect(approveTradeOffer).toHaveBeenCalledOnce())
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Requesting approval…' })).toBeNull())
  expect((screen.getByRole('button', { name: 'Review approval' }) as HTMLButtonElement).disabled).toBe(true)
  expect(sessionStorage.getItem(`fantasy-web-ui.trade-approval.${offer.offer_key}`)).toContain('Approval outcome is unknown')
  spy.mockRestore()
})

it('reviews the final edit, retains the draft, and follows the new key without reopening the original', async () => {
  const newKey = 'b'.repeat(64)
  vi.mocked(approveTradeOffer).mockResolvedValue({ ...approved, offer_key: newKey })
  render(<MantineProvider><TradeOfferApproval config={config} offer={{ ...offer, drafted_message: offer.message, message_edited: false, edited_by: null }} finalMessage="Edited exactly" counterparty="Rival" disabled={false} /><TradeApprovalStatus config={config} /></MantineProvider>)
  await review()
  expect(screen.getByTestId('approval-pitch').textContent).toBe('Edited exactly')
  expect(screen.getByText('Edited by you')).toBeTruthy()
  confirm()
  await screen.findByText('Offer queued. ESPN submission is not yet confirmed.')
  expect(approveTradeOffer).toHaveBeenCalledWith(offer.offer_key, 'Manager', 'Edited exactly')
  expect(JSON.parse(sessionStorage.getItem(`fantasy-web-ui.trade-approval.${newKey}`)! ).response.offer_key).toBe(newKey)
  expect(sessionStorage.getItem(`fantasy-web-ui.trade-approval.${offer.offer_key}`)).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Review approval' }) as HTMLButtonElement).disabled).toBe(true)
  expect(screen.getByText(`Offer key: ${newKey}`)).toBeTruthy()
})

it('re-scores a proposal at review and blocks queueing when live scoring fails', async () => {
  vi.mocked(scoreTrade).mockRejectedValue(new Error('Roster changed'))
  const scored = { ...offer, evaluation: proposalEvaluation() }
  vi.mocked(getTradeProposalStates).mockResolvedValue([scored])
  render(view(config, scored)); await review()
  expect(await screen.findByText(/Roster changed/)).toBeTruthy()
  confirm()
  expect(approveTradeOffer).not.toHaveBeenCalled()
  expect(scoreTrade).toHaveBeenCalledWith({ league_id: '123', season: 2026, week: 5, horizon: 4, our_team_id: '7', counterparty_team_id: '8', send_espn_ids: ['9999'], receive_espn_ids: ['4046'] })
})

it('explains when live scoring is unavailable on a legacy offer', async () => {
  render(view()); await review()
  expect(screen.getByText(/Live scoring is unavailable.*no supported score request/)).toBeTruthy()
})
it('blocks a changed message for an offer whose edit was already persisted', async () => {
  const persisted = { ...offer, drafted_message: 'Original draft', message_edited: true }
  vi.mocked(getTradeProposalStates).mockResolvedValue([persisted])
  render(<MantineProvider><TradeOfferApproval config={config} offer={persisted} finalMessage="Original draft" counterparty="Rival" disabled={false} /></MantineProvider>)
  await waitFor(() => expect(queryClient.getQueryState(['trade-approval-status', '123:7:2026:live'])?.status).toBe('success'))
  expect((screen.getByRole('button', { name: 'Review approval' }) as HTMLButtonElement).disabled).toBe(true)
})
