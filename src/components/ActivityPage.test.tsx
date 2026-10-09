import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ActivityIndicator, ActivityPage, ActionDetailPage } from './ActivityPage'
import { request } from '../api/client'
import { getActions, getAction, markActivityRead } from '../api/dashboard'
import { queryClient, invalidateRoster } from '../api/queryClient'
vi.mock('../api/dashboard', () => ({
  getActions: vi.fn(),
  getAction: vi.fn(),
  markActivityRead: vi.fn(),
  getSessions: vi.fn(),
  checkAction: vi.fn(),
}))
vi.mock('../api/client', () => ({ request: vi.fn() }))
vi.mock('../api/queryClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/queryClient')>()),
  invalidateRoster: vi.fn(),
}))
const action = {
  id: '1',
  league_id: '123',
  title: 'Waiver',
  execution: 'submitted',
  outcome: 'verified_complete',
  kind: 'waiver_actions',
  created_at: '2026-10-05T12:00:00Z',
  updated_at: '2026-10-05T12:00:00Z',
  payload: {},
  evidence: {},
  unread: true,
  attempts: 1,
  events: [],
  sessions: [],
}
beforeEach(() => {
  queryClient.clear()
  vi.clearAllMocks()
  vi.mocked(getActions).mockResolvedValue({ items: [action] })
  vi.mocked(getAction).mockResolvedValue(action)
  vi.mocked(request).mockResolvedValue({ items: [] })
  window.matchMedia = vi
    .fn()
    .mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
})
afterEach(cleanup)
function start(detail = false) {
  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <MemoryRouter initialEntries={['/activity/actions/1']}>
          <ActivityIndicator />
          {detail && (
            <Routes>
              <Route path="/activity/actions/:id" element={<ActionDetailPage />} />
            </Routes>
          )}
        </MemoryRouter>
      </MantineProvider>
    </QueryClientProvider>,
  )
}
it('seeds completed history and invalidates once for newly verified actions', async () => {
  start()
  await screen.findByRole('link', { name: 'Activity · 1 unread' })
  expect(invalidateRoster).not.toHaveBeenCalled()
  await act(async () =>
    queryClient.setQueryData(['activity-indicator'], {
      items: [action, { ...action, id: '2' }, { ...action, id: '3' }],
    }),
  )
  await waitFor(() => expect(invalidateRoster).toHaveBeenCalledTimes(1))
})
it('refreshes unread indicators after marking read', async () => {
  vi.mocked(markActivityRead).mockResolvedValue({ status: 'read' })
  start(true)
  await screen.findByRole('heading', { name: 'Waiver' })
  vi.mocked(getActions).mockResolvedValue({ items: [{ ...action, unread: false }] })
  fireEvent.click(screen.getByRole('button', { name: 'Mark read' }))
  await waitFor(() => expect(screen.queryByRole('link', { name: /1 unread/ })).toBeNull())
  expect(markActivityRead).toHaveBeenCalledWith('1')
})
it('shows a failed read acknowledgement', async () => {
  vi.mocked(markActivityRead).mockRejectedValue(new Error('offline'))
  start(true)
  fireEvent.click(await screen.findByRole('button', { name: 'Mark read' }))
  await screen.findByText(/Could not mark read: Error: offline/)
})

function chained(stage = 'held_for_dependency', detail = {}) {
  return {
    ...action,
    execution: 'queued',
    outcome: 'unknown',
    events: [{ id: 1, stage, detail: { depends_on: 'ir-parent', ...detail }, created_at: action.created_at }],
  }
}

it.each([
  ['held_for_dependency', 'Held for IR move', 'queued', 'unknown'],
  ['dependency_verified', 'Released after IR move', 'delivered', 'unknown'],
  ['dependency_failed', 'Cancelled before submission', 'skipped', 'cancelled'],
])('renders %s with a link to the IR move', async (stage, title, execution, outcome) => {
  vi.mocked(getAction).mockResolvedValue({ ...chained(stage), execution, outcome })
  start(true)
  await screen.findByRole('alert', { name: title })
  expect(screen.getAllByRole('link', { name: 'View IR move' })[0].getAttribute('href')).toBe('/activity/actions/ir-parent')
})

it.each(['parent_skipped', 'parent_rejected', 'parent_failed_permanently', 'hold_expired', 'future_reason'])('explains cancellation reason %s', async (reason) => {
  vi.mocked(getAction).mockResolvedValue({ ...chained('dependency_failed', { reason }), execution: 'skipped', outcome: 'cancelled' })
  start(true)
  await screen.findAllByText('This claim was cancelled and was never sent to ESPN.')
  expect(screen.getAllByText(reason === 'future_reason' ? 'Reason: future reason.' : {
    parent_skipped: 'The IR move was skipped.',
    parent_rejected: 'The IR move was rejected.',
    parent_failed_permanently: 'The IR move failed permanently.',
    hold_expired: 'The wait for the IR move expired.',
  }[reason]!)).toHaveLength(2)
})

it('filters held claims from attention while preserving pagination and released failures', async () => {
  const held = Array.from({ length: 49 }, (_, i) => ({ ...chained(), id: String(i), title: `Held ${i}` }))
  const released = { ...chained('dependency_verified'), id: 'released', title: 'Released claim', execution: 'failed' }
  vi.mocked(getActions).mockResolvedValue({ items: [...held, released] })
  render(<QueryClientProvider client={queryClient}><MantineProvider><MemoryRouter initialEntries={['/activity?tab=attention']}><ActivityPage /></MemoryRouter></MantineProvider></QueryClientProvider>)
  await screen.findByText('Released claim')
  expect(screen.queryByText('Held 0')).toBeNull()
  expect(getActions).toHaveBeenCalledWith(0, true)
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  await waitFor(() => expect(getActions).toHaveBeenCalledWith(50, true))
})

it('shows the attention empty state when the entire page is held', async () => {
  vi.mocked(getActions).mockResolvedValue({ items: [chained()] })
  render(<QueryClientProvider client={queryClient}><MantineProvider><MemoryRouter initialEntries={['/activity?tab=attention']}><ActivityPage /></MemoryRouter></MantineProvider></QueryClientProvider>)
  await screen.findByText('No items need attention on this page.')
  expect(screen.queryByText('Waiver')).toBeNull()
})
