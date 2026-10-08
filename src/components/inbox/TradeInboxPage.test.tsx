import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter } from 'react-router-dom'
import { TradeInboxPage } from './TradeInboxPage'
import { getIncomingTrades, publishIncoming, triageIncoming } from '../../api/tradeInbox'
import { getCurrentWeek, getTeamNames } from '../../api/client'
import { CONFIG_STORAGE_KEY } from '../../hooks/useDraftConfig'
import { config, offer, receipt } from './inboxFixtures'
vi.mock('../../api/tradeInbox', () => ({
  getIncomingTrades: vi.fn(),
  publishIncoming: vi.fn(),
  triageIncoming: vi.fn(),
}))
vi.mock('../../api/client', async (original) => ({
  ...(await original<typeof import('../../api/client')>()),
  getTeamNames: vi.fn().mockResolvedValue({ '8': 'Rival' }),
  getCurrentWeek: vi.fn(),
}))
beforeEach(() => {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config))
  sessionStorage.clear()
  vi.mocked(getIncomingTrades).mockResolvedValue([offer])
  vi.mocked(getCurrentWeek).mockResolvedValue({ week: 5 })
  vi.mocked(getTeamNames).mockResolvedValue({ '8': 'Rival' })
  vi.mocked(publishIncoming).mockResolvedValue(receipt)
})
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
  localStorage.clear()
  sessionStorage.clear()
})
const start = () =>
  render(
    <MantineProvider>
      <MemoryRouter>
        <TradeInboxPage />
      </MemoryRouter>
    </MantineProvider>,
  )
async function review(action = 'Accept') {
  await waitFor(() =>
    expect((screen.getByRole('button', { name: action }) as HTMLButtonElement).disabled).toBe(
      false,
    ),
  )
  fireEvent.click(screen.getByRole('button', { name: action }))
  await screen.findByRole('dialog')
  await waitFor(() => expect(screen.queryByText('Verifying current offer…')).toBeNull())
}
function confirm(action = 'accept', comment = '') {
  fireEvent.change(screen.getByLabelText('Approver label'), {
    target: { value: ' Manager ' },
  })
  if (action !== 'counter')
    fireEvent.change(screen.getByLabelText('Response comment'), {
      target: { value: comment },
    })
  fireEvent.click(screen.getByLabelText('I reviewed these exact players and notes.'))
  fireEvent.click(
    screen.getByRole('button', {
      name: action === 'counter' ? 'Queue negotiation' : `Confirm ${action} and queue`,
    }),
  )
}
it('shows honest score gaps, exact note, refresh evidence and production configuration', async () => {
  start()
  await screen.findByText('Received Back')
  expect(screen.getByText(/Responses are disabled/)).toBeTruthy()
  expect(screen.getByText(/single-week evidence only/)).toBeTruthy()
  expect(screen.getByText(/G\*.*Unavailable/)).toBeTruthy()
  expect(screen.getByTestId('incoming-note').textContent).toBe(offer.comment)
  expect(publishIncoming).not.toHaveBeenCalled()
})
it('toggles hidden offers separately from history', async () => {
  start()
  await screen.findByText('Received Back')
  fireEvent.click(screen.getByLabelText('Show snoozed and dismissed'))
  await waitFor(() => expect(getIncomingTrades).toHaveBeenLastCalledWith(config, 'live', 'all'))
  fireEvent.click(screen.getByLabelText('Include history'))
  await waitFor(() => expect(getIncomingTrades).toHaveBeenLastCalledWith(config, 'all', 'all'))
})
it('requires exact confirmation, permits cancellation and guards repeat clicks', async () => {
  let resolve!: (r: typeof receipt) => void
  vi.mocked(publishIncoming).mockReturnValue(
    new Promise((r) => {
      resolve = r
    }),
  )
  start()
  await review()
  expect(screen.getByRole('dialog').textContent).toContain(offer.comment)
  expect(screen.getByRole('dialog').textContent).toContain('Sent Back (ESPN 111)')
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(publishIncoming).not.toHaveBeenCalled()
  await review()
  confirm('accept', ' Yes ')
  fireEvent.click(screen.getByRole('button', { name: 'Confirm accept and queue' }))
  await waitFor(() => expect(publishIncoming).toHaveBeenCalledOnce())
  expect(publishIncoming).toHaveBeenCalledWith('123', {
    action: 'accept',
    approved_by: 'Manager',
    comment: 'Yes',
  })
  resolve(receipt)
  await screen.findByText(/Decision queued — ESPN outcome unconfirmed/)
  expect((screen.getByRole('button', { name: 'Decline' }) as HTMLButtonElement).disabled).toBe(true)
})
it('retains network uncertainty across remount without retrying', async () => {
  vi.mocked(publishIncoming).mockRejectedValue(new Error('Connection lost'))
  const view = start()
  await review('Decline')
  confirm('decline')
  await screen.findByText(/Outcome unknown.*Connection lost/)
  view.unmount()
  start()
  await screen.findByText(/Outcome unknown.*Connection lost/)
  expect((screen.getByRole('button', { name: 'Accept' }) as HTMLButtonElement).disabled).toBe(true)
  expect(publishIncoming).toHaveBeenCalledOnce()
})
it('blocks a changed original note during final verification', async () => {
  start()
  await review()
  vi.mocked(getIncomingTrades).mockResolvedValue([{ ...offer, comment: 'Changed' }])
  confirm()
  await screen.findByText(/Offer changed/)
  expect(publishIncoming).not.toHaveBeenCalled()
})
it('unmounting during final verification prevents publication', async () => {
  const view = start()
  await review()
  let resolve!: (rows: (typeof offer)[]) => void
  vi.mocked(getIncomingTrades).mockReturnValue(
    new Promise((r) => {
      resolve = r
    }),
  )
  confirm()
  view.unmount()
  resolve([offer])
  await new Promise((r) => setTimeout(r, 0))
  expect(publishIncoming).not.toHaveBeenCalled()
})
it('queues counter negotiation only with a separately confirmed audit label', async () => {
  vi.mocked(publishIncoming).mockResolvedValue({
    ...receipt,
    kind: 'counter',
    action: null,
    decision_key: null,
  })
  start()
  await review('Counter')
  confirm('counter')
  await waitFor(() =>
    expect(publishIncoming).toHaveBeenCalledWith('123', {
      approved_by: 'Manager',
      week: 5,
    }),
  )
  await screen.findByText(/Negotiation queued — no ESPN counter confirmed/)
})
it('triage validates a future snooze and only posts after explicit save', async () => {
  vi.mocked(triageIncoming).mockResolvedValue({
    ...offer,
    triage: { state: 'seen', by: 'Manager' },
  })
  start()
  await screen.findByText('Received Back')
  await waitFor(() =>
    expect((screen.getByRole('button', { name: 'Triage' }) as HTMLButtonElement).disabled).toBe(
      false,
    ),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Triage' }))
  fireEvent.change(await screen.findByLabelText('Triage audit label'), {
    target: { value: 'Manager' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Mark seen' }))
  await waitFor(() =>
    expect(triageIncoming).toHaveBeenCalledWith('123', {
      state: 'seen',
      by: 'Manager',
    }),
  )
  expect(publishIncoming).not.toHaveBeenCalled()
})
it('failed refresh retains rows and blocks response actions', async () => {
  start()
  await screen.findByText('Received Back')
  vi.mocked(getIncomingTrades).mockRejectedValue(new Error('Read failed'))
  fireEvent.click(screen.getByRole('button', { name: 'Refresh inbox' }))
  await screen.findByText(/Previously loaded offers may be out of date/)
  expect(screen.getByText('Received Back')).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Accept' }) as HTMLButtonElement).disabled).toBe(true)
})
it.each([404, 409, 422, 503, 500])(
  'handles HTTP %s without claiming an ESPN response',
  async (status) => {
    const { ApiError } = await import('../../api/client')
    vi.mocked(publishIncoming).mockRejectedValue(new ApiError(status, 'Core reason'))
    start()
    await review()
    confirm()
    await screen.findByText(status === 404 ? /Offer not found/ : /Core reason/)
    expect(publishIncoming).toHaveBeenCalledOnce()
    expect(screen.queryByText('Responded — accepted in ESPN.')).toBeNull()
  },
)
it('a storage failure before POST prevents publication', async () => {
  start()
  await review()
  const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Storage unavailable')
  })
  try {
    confirm()
    await screen.findByText('Storage unavailable')
    expect(publishIncoming).not.toHaveBeenCalled()
  } finally {
    spy.mockRestore()
  }
})
it('a storage failure after POST retains the durable unknown marker', async () => {
  start()
  await review()
  const original = Storage.prototype.setItem
  let count = 0
  const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
    this: Storage,
    key,
    value,
  ) {
    if (++count > 1) throw new Error('Storage unavailable')
    original.call(this, key, value)
  })
  try {
    confirm()
    await waitFor(() => expect(publishIncoming).toHaveBeenCalledOnce())
    await screen.findByText(/Outcome unknown — checking publication/)
    expect((screen.getByRole('button', { name: 'Accept' }) as HTMLButtonElement).disabled).toBe(
      true,
    )
  } finally {
    spy.mockRestore()
  }
})
it('confirmed outcomes remain discoverable after the offer leaves the live list', async () => {
  start()
  await review()
  confirm()
  await screen.findByText(/Decision queued — ESPN outcome unconfirmed/)
  vi.mocked(getIncomingTrades).mockImplementation(async (_config, status) =>
    status === 'all' ? [{ ...offer, status: 'accepted', decision: { outcome: 'accepted' } }] : [],
  )
  fireEvent.click(screen.getByRole('button', { name: 'Refresh inbox' }))
  await screen.findByText('Responded — accepted in ESPN.')
  expect(publishIncoming).toHaveBeenCalledOnce()
})
it('snooze refuses past dates then sends an aware future timestamp', async () => {
  vi.mocked(triageIncoming).mockResolvedValue({
    ...offer,
    triage: { state: 'snoozed' },
  })
  start()
  await screen.findByText('Received Back')
  await waitFor(() =>
    expect((screen.getByRole('button', { name: 'Triage' }) as HTMLButtonElement).disabled).toBe(
      false,
    ),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Triage' }))
  fireEvent.change(await screen.findByLabelText('Triage audit label'), {
    target: { value: 'Manager' },
  })
  fireEvent.change(screen.getByLabelText('Snooze until (your local time)'), {
    target: { value: '2000-01-01T12:00' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Snooze' }))
  await screen.findByText('Choose a future snooze time.')
  expect(triageIncoming).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('Snooze until (your local time)'), {
    target: { value: '2099-01-01T12:00' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Snooze' }))
  await waitFor(() =>
    expect(triageIncoming).toHaveBeenCalledWith('123', {
      state: 'snoozed',
      by: 'Manager',
      snooze_until: new Date('2099-01-01T12:00').toISOString(),
    }),
  )
})
it('decline remains usable when the current week cannot be read', async () => {
  vi.mocked(getCurrentWeek).mockRejectedValue(new Error('Week unavailable'))
  vi.mocked(publishIncoming).mockResolvedValue({ ...receipt, action: 'decline' })
  start()
  await review('Decline')
  confirm('decline')
  await waitFor(() =>
    expect(publishIncoming).toHaveBeenCalledWith('123', {
      action: 'decline',
      approved_by: 'Manager',
    }),
  )
})
it.each(['null', '{}', 'corrupted'])(
  'malformed stored safety state %s fails closed',
  async (raw) => {
    sessionStorage.setItem('fantasy-web-ui.inbox-action.123:7:2026:live:123', raw)
    start()
    await screen.findByText('Received Back')
    await screen.findByText(/Stored outcome is unknown/)
    expect((screen.getByRole('button', { name: 'Accept' }) as HTMLButtonElement).disabled).toBe(
      true,
    )
  },
)

it('offers Retry only on a row whose worker response ESPN rejected or left unknown', async () => {
  const response = {
    id: 41,
    status: 'rejected' as const,
    action: 'decline',
    decision_key: 'a'.repeat(64),
  }
  vi.mocked(getIncomingTrades).mockResolvedValue([
    { ...offer, response },
    {
      ...offer,
      id: 2,
      espn_transaction_id: '124',
      response: { ...response, id: 42, status: 'responding' },
    },
  ])
  start()
  expect(await screen.findByRole('button', { name: 'Retry decline' })).toBeTruthy()
  expect(screen.getAllByRole('button', { name: /^Retry / })).toHaveLength(1)
})
it('reconciles network uncertainty to a matching recorded queue publication without replay', async () => {
  vi.mocked(publishIncoming).mockImplementation(async () => {
    const marker = JSON.parse(
      sessionStorage.getItem('fantasy-web-ui.inbox-action.123:7:2026:live:123')!,
    )
    vi.mocked(getIncomingTrades).mockResolvedValue([
      {
        ...offer,
        publications: [
          {
            kind: 'decision',
            status: 'queued',
            tracking_id: 'track',
            approved_by: 'Manager',
            approved_at: new Date().toISOString(),
            fingerprint: offer.fingerprint!,
            action: 'accept',
            decision_key: marker.decisionKey,
          },
        ],
      },
    ])
    throw new Error('Connection lost')
  })
  start()
  await review()
  confirm()
  await screen.findByText('Decision queued — ESPN outcome unconfirmed.')
  expect((screen.getByRole('button', { name: 'Accept' }) as HTMLButtonElement).disabled).toBe(true)
  expect(publishIncoming).toHaveBeenCalledOnce()
})
it('only a new matching failed-before-publication claim permits another explicit confirmation', async () => {
  const { ApiError } = await import('../../api/client')
  vi.mocked(publishIncoming).mockImplementationOnce(async () => {
    const marker = JSON.parse(
      sessionStorage.getItem('fantasy-web-ui.inbox-action.123:7:2026:live:123')!,
    )
    vi.mocked(getIncomingTrades).mockResolvedValue([
      {
        ...offer,
        publications: [
          {
            kind: 'decision',
            status: 'failed_before_publish',
            tracking_id: 'new-failed',
            approved_by: 'Manager',
            approved_at: new Date().toISOString(),
            fingerprint: offer.fingerprint!,
            action: 'accept',
            decision_key: marker.decisionKey,
          },
        ],
      },
    ])
    throw new ApiError(503, 'Publication failed')
  })
  start()
  await review()
  confirm()
  await screen.findByText('Failed before publication — review the same request again to retry.')
  await review()
  confirm()
  await waitFor(() => expect(publishIncoming).toHaveBeenCalledTimes(2))
})
