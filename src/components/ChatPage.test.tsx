import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { queryClient } from '../api/queryClient'
import { ApiError, queryChat } from '../api/client'
import { getSession } from '../api/dashboard'
import type { ChatQueryResponse } from '../api/types'
import { CONFIG_STORAGE_KEY } from '../hooks/useDraftConfig'
import { ChatPage } from './ChatPage'
import { DraftConfigProvider } from './DraftConfigProvider'

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  queryChat: vi.fn(),
  getCurrentWeek: vi.fn().mockResolvedValue({ week: 5 }),
}))
vi.mock('../api/dashboard', () => ({ getSession: vi.fn() }))

function answer(text: string, session_id = 's1'): ChatQueryResponse {
  return {
    session_id,
    answer: text,
    provider: 'groq',
    model: 'gpt-oss',
    latency_ms: 420,
    grounding: { roster_deficits: {}, trade_evaluation: null },
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.search}</output>
}

function start(url = '/chat?week=5') {
  render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <DraftConfigProvider>
          <MemoryRouter initialEntries={[url]}>
            <Routes>
              <Route path="/chat" element={<><ChatPage /><LocationProbe /></>} />
            </Routes>
          </MemoryRouter>
        </DraftConfigProvider>
      </QueryClientProvider>
    </MantineProvider>,
  )
}

async function ask(text: string) {
  const box = await screen.findByRole('textbox', { name: /question/i })
  fireEvent.change(box, { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: 'Ask' }))
}

beforeEach(() => {
  queryClient.clear()
  vi.clearAllMocks()
  localStorage.setItem(
    CONFIG_STORAGE_KEY,
    JSON.stringify({ league_id: '123', team_id: '8', season: 2026, mode: 'live' }),
  )
})
afterEach(() => {
  cleanup()
  localStorage.clear()
})

it('keeps every question and answer in the thread and sends follow-ups in the same session', async () => {
  const second = deferred<ChatQueryResponse>()
  vi.mocked(queryChat).mockResolvedValueOnce(answer('First answer')).mockReturnValueOnce(second.promise)
  start()

  await ask('Who is my weakest starter?')
  await screen.findByText('First answer')
  await waitFor(() => expect(screen.getByTestId('location').textContent).toContain('session=s1'))

  await ask('Who should replace them?')
  // The earlier turn stays on screen while the follow-up is in flight.
  expect(screen.getByText('First answer')).toBeTruthy()
  expect(screen.getByText('Who should replace them?')).toBeTruthy()
  expect(screen.getByRole('status', { name: 'Waiting for an answer' })).toBeTruthy()

  second.resolve(answer('Second answer'))
  await screen.findByText('Second answer')
  expect(screen.getByText('Who is my weakest starter?')).toBeTruthy()
  expect(screen.getAllByText('groq / gpt-oss · 420ms')).toHaveLength(2)
  expect(vi.mocked(queryChat).mock.calls).toEqual([
    ['Who is my weakest starter?', 2026, 5, '8', undefined],
    ['Who should replace them?', 2026, 5, '8', 's1'],
  ])
  expect(getSession).not.toHaveBeenCalled()
})

it('loads a saved session from the URL and continues it', async () => {
  vi.mocked(getSession).mockResolvedValue({
    id: 's9',
    title: 'Earlier question',
    status: 'completed',
    updated_at: '2026-10-05T12:00:00Z',
    content: [
      { role: 'user', content: 'Earlier question' },
      { role: 'response', content: { text: 'x', provider: 'ollama', model: 'llama', latency_ms: 77 } },
      { role: 'answer', content: 'Earlier answer' },
    ],
  })
  vi.mocked(queryChat).mockResolvedValue(answer('Follow-up answer', 's9'))
  start('/chat?week=5&session=s9')

  await screen.findByText('Earlier answer')
  expect(screen.getByText('Earlier question')).toBeTruthy()
  expect(screen.getByText('ollama / llama · 77ms')).toBeTruthy()
  expect(getSession).toHaveBeenCalledWith('s9')

  await ask('And next week?')
  await screen.findByText('Follow-up answer')
  expect(vi.mocked(queryChat)).toHaveBeenCalledWith('And next week?', 2026, 5, '8', 's9')
  expect(screen.getByText('Earlier answer')).toBeTruthy()
})

it('shows a load error for a session that cannot be read', async () => {
  vi.mocked(getSession).mockRejectedValue(new ApiError(404, 'Session not found'))
  start('/chat?week=5&session=missing')
  expect(await screen.findByText('Session not found')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Ask' })).toBeNull()
})

it('reports no-provider on the failed turn and retries it in place', async () => {
  vi.mocked(queryChat)
    .mockResolvedValueOnce(answer('First answer'))
    .mockRejectedValueOnce(new ApiError(503, 'no provider'))
    .mockResolvedValueOnce(answer('Recovered answer'))
  start()

  await ask('First?')
  await screen.findByText('First answer')
  await ask('Second?')
  const notice = await screen.findByRole('alert')
  expect(within(notice).getByText('No AI provider available')).toBeTruthy()
  expect(screen.getByText('First answer')).toBeTruthy()

  fireEvent.click(within(notice).getByRole('button', { name: 'Retry' }))
  await screen.findByText('Recovered answer')
  expect(screen.queryByRole('alert')).toBeNull()
  expect(vi.mocked(queryChat).mock.calls[2]).toEqual(['Second?', 2026, 5, '8', 's1'])
  expect(screen.getAllByText('Second?')).toHaveLength(1)
})

it('shows other errors on the turn that failed', async () => {
  vi.mocked(queryChat).mockRejectedValue(new ApiError(500, 'Upstream exploded'))
  start()
  await ask('Anything?')
  const alert = await screen.findByRole('alert')
  expect(within(alert).getByText('Upstream exploded')).toBeTruthy()
  expect(screen.getByText('Anything?')).toBeTruthy()
})

it('starts a new conversation without a session id', async () => {
  vi.mocked(queryChat).mockResolvedValueOnce(answer('Old answer')).mockResolvedValueOnce(answer('Fresh', 's2'))
  start()
  await ask('Old question')
  await screen.findByText('Old answer')

  fireEvent.click(screen.getByRole('button', { name: 'New conversation' }))
  expect(screen.queryByText('Old answer')).toBeNull()
  await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('?week=5'))

  await ask('Fresh question')
  await screen.findByText('Fresh')
  expect(vi.mocked(queryChat).mock.calls[1]).toEqual(['Fresh question', 2026, 5, '8', undefined])
})

it('renders answers as Markdown without rendering raw HTML', async () => {
  vi.mocked(queryChat).mockResolvedValue(
    answer('**Weakest:** RB\n\n| Team | QB |\n|---|---|\n| Mine | 12.5 |\n\n<b>raw</b>'),
  )
  start()
  await ask('Compare?')
  const table = await screen.findByRole('table')
  expect(within(table).getByRole('columnheader', { name: 'Team' })).toBeTruthy()
  expect(within(table).getByRole('cell', { name: '12.5' })).toBeTruthy()
  expect(screen.getByText('Weakest:').tagName).toBe('STRONG')
  expect(document.querySelector('.chat-markdown b')).toBeNull()
  expect(screen.queryByText('**Weakest:**', { exact: false })).toBeNull()
})

it('clears a conversation loaded from the URL when starting a new one', async () => {
  vi.mocked(getSession).mockResolvedValue({
    id: 's9',
    title: 'Saved',
    status: 'completed',
    updated_at: '2026-10-05T12:00:00Z',
    content: [
      { role: 'user', content: 'Saved question' },
      { role: 'answer', content: 'Saved answer' },
    ],
  })
  start('/chat?week=5&session=s9')
  await screen.findByText('Saved answer')

  fireEvent.click(screen.getByRole('button', { name: 'New conversation' }))
  await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('?week=5'))
  expect(screen.queryByText('Saved answer')).toBeNull()
  expect(screen.queryByRole('button', { name: 'New conversation' })).toBeNull()
})
