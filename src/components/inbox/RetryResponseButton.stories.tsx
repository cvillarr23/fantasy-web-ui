import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, screen, userEvent } from 'storybook/test'
import { mockFetch } from '../../../.storybook/mockFetch'
import { RetryResponseButton, type RetryableOffer } from './RetryResponseButton'

const key = 'a'.repeat(64)
const offer: RetryableOffer = {
  review_token: key,
  other_items: [],
  espn_transaction_id: '123',
  proposing_team_id: '8',
  comment: 'Their note',
  send_players: [{ espn_id: '999', name: 'Sent Back' }],
  receive_players: [{ espn_id: '888', name: null }],
  response: { id: 41, status: 'rejected', action: 'decline', decision_key: key },
}
const receipt = {
  espn_transaction_id: '123',
  status: 'queued',
  kind: 'decision',
  tracking_id: 'track-2',
  approved_by: 'Manager',
  approved_at: '2026-10-07T18:00:00Z',
  duplicate: false,
  decision_key: key,
  action: 'decline',
  retry_of: 41,
}
const retryPath = '/v1/trade/incoming/123/decision/retry'

async function reviewAndConfirm() {
  await userEvent.click(screen.getByRole('button', { name: 'Retry decline' }))
  await userEvent.type(await screen.findByLabelText(/Approver label/), 'Manager')
  await userEvent.click(screen.getByLabelText('I reviewed these exact players and notes.'))
  await userEvent.click(screen.getByRole('button', { name: 'Retry decline and queue' }))
}

/** Retries a failed accept or decline after the manager reviews the exact offer again.
 * The dialog renders in a portal, so the stories query the whole document. */
const meta = {
  title: 'Inbox/RetryResponseButton',
  component: RetryResponseButton,
  args: { offer, onQueued: fn() },
  beforeEach: () => {
    sessionStorage.clear()
    mockFetch([{ path: retryPath, method: 'POST', body: receipt }])
  },
} satisfies Meta<typeof RetryResponseButton>

export default meta
type Story = StoryObj<typeof meta>

export const Rejected: Story = {}

export const Queued: Story = {
  play: async ({ args }) => {
    await reviewAndConfirm()
    await expect(await screen.findByText(/Retry queued/)).toBeVisible()
    await expect(args.onQueued).toHaveBeenCalledOnce()
  },
}

/** An unknown outcome also needs confirmation that someone checked ESPN. */
export const UnknownOutcome: Story = {
  args: { offer: { ...offer, response: { ...offer.response!, status: 'response_unknown' } } },
  play: async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Retry decline' }))
    await expect(await screen.findByLabelText(/I checked ESPN and this offer wasn't answered/)).toBeInTheDocument()
  },
}

/** A 503 leaves the outcome unknown, so the dialog offers no second click. */
export const OutcomeUnknownError: Story = {
  beforeEach: () => mockFetch([{ path: retryPath, method: 'POST', status: 503, body: { detail: 'Reason' } }]),
  play: async () => {
    await reviewAndConfirm()
    await expect(await screen.findByText(/Outcome unknown/)).toBeVisible()
    await expect(screen.getByRole('link', { name: 'Verify in Activity' })).toBeVisible()
  },
}

/** No retry is offered while a response is still in flight. */
export const Responding: Story = {
  args: { offer: { ...offer, response: { ...offer.response!, status: 'responding' } } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button', { name: /Retry/ })).toBeNull()
  },
}
