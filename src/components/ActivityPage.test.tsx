import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ActivityIndicator, ActionDetailPage } from './ActivityPage'
import { getActions, getAction, markActivityRead } from '../api/dashboard'
import { queryClient, invalidateRoster } from '../api/queryClient'
vi.mock('../api/dashboard', () => ({
  getActions: vi.fn(),
  getAction: vi.fn(),
  markActivityRead: vi.fn(),
  getSessions: vi.fn(),
  checkAction: vi.fn(),
}))
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
  vi.clearAllMocks()
  vi.mocked(getActions).mockResolvedValue({ items: [action] })
  vi.mocked(getAction).mockResolvedValue(action)
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
