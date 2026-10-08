import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { retryIncomingDecision } from '../../api/tradeResponseRetry'
import { RetryResponseButton } from './RetryResponseButton'
import type { RetryableOffer } from './RetryResponseButton'

vi.mock('../../api/tradeResponseRetry', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/tradeResponseRetry')>()),
  retryIncomingDecision: vi.fn(),
}))

const key = 'a'.repeat(64)
const offer: RetryableOffer = {
  espn_transaction_id: '123',
  proposing_team_id: '3',
  comment: 'Their note',
  send_players: [{ espn_id: '999', name: 'Our Player' }],
  receive_players: [{ espn_id: '888', name: null }],
  response: { id: 41, status: 'rejected', action: 'decline', decision_key: key },
}
const receipt = {
  espn_transaction_id: '123',
  status: 'queued' as const,
  kind: 'decision' as const,
  tracking_id: 'track-2',
  approved_by: 'Manager',
  approved_at: '2026-10-07T18:00:00Z',
  duplicate: false,
  decision_key: key,
  action: 'decline' as const,
  retry_of: 41,
}
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
  sessionStorage.clear()
})
const view = (row: RetryableOffer = offer, onQueued = vi.fn()) =>
  render(
    <MantineProvider>
      <MemoryRouter>
        <RetryResponseButton offer={row} onQueued={onQueued} />
      </MemoryRouter>
    </MantineProvider>,
  )

async function openDialog() {
  fireEvent.click(screen.getByRole('button', { name: 'Retry decline' }))
  await screen.findByLabelText(/Approver label/)
}

function fillApprover(name = 'Manager') {
  fireEvent.change(screen.getByLabelText(/Approver label/), { target: { value: name } })
  const check = screen.getByLabelText(
    'I reviewed these exact players and notes.',
  ) as HTMLInputElement
  if (!check.checked) fireEvent.click(check)
}

it.each(['responding', 'responded'] as const)('shows no Retry for a %s response', (status) => {
  view({ ...offer, response: { ...offer.response!, status } })
  expect(screen.queryByRole('button', { name: /Retry/ })).toBeNull()
})

it('shows no Retry without a worker response', () => {
  view({ ...offer, response: null })
  expect(screen.queryByRole('button', { name: /Retry/ })).toBeNull()
})

it('retries a rejected response after review, once', async () => {
  vi.mocked(retryIncomingDecision).mockResolvedValue(receipt)
  const onQueued = vi.fn()
  view(offer, onQueued)
  await openDialog()
  expect(screen.getByText(/ESPN rejected the earlier decline/)).toBeTruthy()
  expect(screen.getByText('Our Player (ESPN 999)')).toBeTruthy()
  expect(screen.getByText('Unnamed player (ESPN 888)')).toBeTruthy()
  const confirm = screen.getByRole('button', {
    name: 'Retry decline and queue',
  }) as HTMLButtonElement
  expect(confirm.disabled).toBe(true)
  fillApprover()
  expect(confirm.disabled).toBe(false)
  fireEvent.click(confirm)
  fireEvent.click(confirm)
  await screen.findByText(/Retry queued/)
  expect(retryIncomingDecision).toHaveBeenCalledTimes(1)
  expect(retryIncomingDecision).toHaveBeenCalledWith('123', offer.response, 'Manager', false)
  expect(onQueued).toHaveBeenCalledWith(receipt)
  expect(screen.queryByRole('button', { name: 'Retry decline' })).toBeNull()
})

it('needs the ESPN check before retrying an unknown outcome', async () => {
  vi.mocked(retryIncomingDecision).mockResolvedValue(receipt)
  const unknown = {
    ...offer,
    response: { ...offer.response!, status: 'response_unknown' as const },
  }
  view(unknown)
  await openDialog()
  expect(screen.getByText(/may already have reached ESPN/)).toBeTruthy()
  fillApprover()
  const confirm = screen.getByRole('button', {
    name: 'Retry decline and queue',
  }) as HTMLButtonElement
  expect(confirm.disabled).toBe(true)
  fireEvent.click(screen.getByLabelText(/I checked ESPN and this offer wasn't answered/))
  expect(confirm.disabled).toBe(false)
  fireEvent.click(confirm)
  await waitFor(() =>
    expect(retryIncomingDecision).toHaveBeenCalledWith('123', unknown.response, 'Manager', true),
  )
})

it.each([
  [409, /reconciliation required/],
  [404, /Refresh/],
  [503, /Outcome unknown/],
])('explains a %s and does not offer another click', async (status, message) => {
  vi.mocked(retryIncomingDecision).mockRejectedValue(new ApiError(status, 'Reason'))
  view()
  await openDialog()
  fillApprover()
  fireEvent.click(screen.getByRole('button', { name: 'Retry decline and queue' }))
  expect(await screen.findByText(message)).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Retry decline and queue' })).toBeNull()
  expect(screen.getByRole('link', { name: 'Verify in Activity' })).toBeTruthy()
})

it('lets a rejected input be corrected and sent again', async () => {
  vi.mocked(retryIncomingDecision)
    .mockRejectedValueOnce(new ApiError(422, 'approved_by: too long'))
    .mockResolvedValue(receipt)
  view()
  await openDialog()
  fillApprover()
  fireEvent.click(screen.getByRole('button', { name: 'Retry decline and queue' }))
  expect(await screen.findByText(/correct the input/)).toBeTruthy()
  fireEvent.click(screen.getByLabelText('I reviewed these exact players and notes.'))
  fireEvent.click(screen.getByRole('button', { name: 'Retry decline and queue' }))
  await screen.findByText(/Retry queued/)
})
it('retains uncertainty across remount and reviews the stored response comment', async () => {
  vi.mocked(retryIncomingDecision).mockRejectedValue(new Error('Connection lost'))
  const row = { ...offer, responseComment: '  Exact response\n第二行  ' }
  const current = view(row)
  await openDialog()
  expect(screen.getByTestId('retry-response-comment').textContent).toBe(row.responseComment)
  fillApprover()
  fireEvent.click(screen.getByRole('button', { name: 'Retry decline and queue' }))
  await screen.findByText(/Outcome unknown.*Connection lost/)
  current.unmount()
  view(row)
  expect(await screen.findByText(/Outcome unknown.*Connection lost/)).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Retry decline' })).toBeNull()
  expect(retryIncomingDecision).toHaveBeenCalledOnce()
})
it('does not publish when final verification reports changed details', async () => {
  vi.mocked(retryIncomingDecision).mockResolvedValue(receipt)
  render(
    <MantineProvider>
      <MemoryRouter>
        <RetryResponseButton
          offer={offer}
          verify={async () => {
            throw new Error('Offer changed')
          }}
        />
      </MemoryRouter>
    </MantineProvider>,
  )
  await openDialog()
  fillApprover()
  fireEvent.click(screen.getByRole('button', { name: 'Retry decline and queue' }))
  await screen.findByText(/Offer changed/)
  expect(retryIncomingDecision).not.toHaveBeenCalled()
})
