import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { RunsPanel } from './RunsPanel'
import { RunDetailPage, TracePage } from './RunDetailPage'
import { getJobs, getRun, getRuns, getTrace, type Run } from '../api/runs'
import { queryClient } from '../api/queryClient'

vi.mock('../api/runs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/runs')>()),
  getRuns: vi.fn(),
  getRun: vi.fn(),
  getJobs: vi.fn(),
  getTrace: vi.fn(),
}))

const run: Run = {
  id: 'run-1',
  job_name: 'rumor_digest_bot',
  trigger_type: 'schedule',
  trigger: { cronjob: 'rumor-digest-bot', k8s_job: 'rumor-digest-bot-29863680' },
  status: 'success',
  started_at: '2026-10-12T16:00:00Z',
  finished_at: '2026-10-12T16:01:30Z',
  summary: { parse_retries: 1 },
  input_count: 3,
  output_count: 2,
  llm_count: 1,
}

beforeEach(() => {
  queryClient.clear()
  vi.clearAllMocks()
  vi.mocked(getRuns).mockResolvedValue({ items: [run] })
  vi.mocked(getJobs).mockResolvedValue({
    items: [{ ...run, job_name: 'sync_rumors', status: 'failure', recent_failures: 2 }],
    dead_letters: [
      { queue: 'waiver_actions.dlq', messages: 2 },
      { queue: 'lineup_updates.dlq', messages: 0 },
    ],
  })
  window.matchMedia = vi
    .fn()
    .mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
})
afterEach(cleanup)

function renderAt(path: string) {
  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/activity" element={<RunsPanel />} />
            <Route path="/activity/runs/:id" element={<RunDetailPage />} />
            <Route path="/activity/trace/:type/:id" element={<TracePage />} />
          </Routes>
        </MemoryRouter>
      </MantineProvider>
    </QueryClientProvider>,
  )
}

it('lists runs with trigger, status, duration and input/output counts', async () => {
  renderAt('/activity')
  expect(await screen.findByRole('link', { name: 'rumor digest bot' })).toBeTruthy()
  const table = within(screen.getByRole('table'))
  expect(table.getByText('Scheduled')).toBeTruthy()
  expect(table.getByText('1m 30s')).toBeTruthy()
  expect(table.getByText('3 → 2 · 1 LLM')).toBeTruthy()
})

it('shows job health and only the dead-letter queues holding messages', async () => {
  renderAt('/activity')
  expect(await screen.findByText('2 of last 10 runs failed')).toBeTruthy()
  expect(screen.getByText(/waiver_actions\.dlq: 2/)).toBeTruthy()
  expect(screen.queryByText(/lineup_updates\.dlq/)).toBeNull()
})

it('filters the table to a job picked from the health strip', async () => {
  renderAt('/activity')
  fireEvent.click(await screen.findByRole('button', { name: /sync rumors/ }))
  await waitFor(() => expect(getRuns).toHaveBeenLastCalledWith(0, { job: 'sync_rumors' }))
})

it('shows what a run read and produced, and links articles to their trace', async () => {
  vi.mocked(getRun).mockResolvedValue({
    ...run,
    parent: null,
    children: [],
    links: {
      input: {
        raw_signal: [
          {
            id: '6381',
            source: 'rotowire_rss',
            player_name: 'Player One',
            text: 'Player One limited at practice',
            url: 'https://example.test/1',
          },
        ],
      },
      output: {
        rumor_signal: [
          { id: '748', player_name: 'Player One', sentiment: 'negative', confidence: 0.9, suggested_action: 'bench_watch' },
        ],
        llm_session: [{ id: 's-1', title: 'rumor_digest', status: 'completed' }],
      },
    },
  })
  renderAt('/activity/runs/run-1')
  expect(await screen.findByText('Player One limited at practice')).toBeTruthy()
  expect(screen.getByText('90% confidence')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'rumor_digest' }).getAttribute('href')).toBe(
    '/activity/sessions/s-1',
  )
  const traces = screen.getAllByRole('link', { name: 'Trace' }).map((a) => a.getAttribute('href'))
  expect(traces).toEqual(['/activity/trace/raw_signal/6381', '/activity/trace/rumor_signal/748'])
})

it('shows a failed run error', async () => {
  vi.mocked(getRun).mockResolvedValue({
    ...run,
    status: 'failure',
    error: 'LLM response was not valid JSON',
    parent: null,
    children: [],
    links: {},
  })
  renderAt('/activity/runs/run-1')
  expect(await screen.findByText('LLM response was not valid JSON')).toBeTruthy()
  expect(screen.getByText(/no linked articles/)).toBeTruthy()
})

it('walks a trace stage by stage', async () => {
  vi.mocked(getTrace).mockResolvedValue({
    root: { ref_type: 'raw_signal', ref_id: '6381' },
    stages: [
      { key: 'ingest', title: 'Article ingested', runs: [{ ...run, job_name: 'sync_rumors' }], sessions: [], items: [] },
      { key: 'evaluation', title: 'LLM evaluation', runs: [run], sessions: [], items: [] },
      { key: 'decision', title: 'Action decision', runs: [], sessions: [], items: [] },
      { key: 'submission', title: 'Roster move queued', runs: [], sessions: [], items: [] },
      { key: 'execution', title: 'Executed by worker', runs: [], sessions: [], items: [] },
    ],
  })
  renderAt('/activity/trace/raw_signal/6381')
  expect(await screen.findByText('1. Article ingested')).toBeTruthy()
  expect(getTrace).toHaveBeenCalledWith('raw_signal', '6381')
  expect(screen.getByRole('link', { name: /sync rumors/ }).getAttribute('href')).toBe('/activity/runs/run-1')
  expect(screen.getAllByText('Nothing recorded at this stage.')).toHaveLength(3)
})
