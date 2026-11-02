import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { getJobCatalog, getUiConfig } from '../api/jobs'
import { queryClient } from '../api/queryClient'
import { getJobs, getRun, getRuns, type RunDetail } from '../api/runs'
import { catalogFixture, chainRootFixture, jobFixture, runDetailFixture } from './jobs/fixtures'
import { RunDetailPage } from './RunDetailPage'
import { RunsPanel } from './RunsPanel'

vi.mock('../api/jobs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/jobs')>()),
  getJobCatalog: vi.fn(),
  getUiConfig: vi.fn(),
}))
vi.mock('../api/runs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/runs')>()),
  getRun: vi.fn(),
  getRuns: vi.fn(),
  getJobs: vi.fn(),
}))

const catalog = { ...catalogFixture, jobs: [...catalogFixture.jobs, jobFixture({ name: 'claim-waivers', max_attempts: 3 })].slice(-1) }

function openRun(run: RunDetail, state?: { from: string }) {
  vi.mocked(getRun).mockResolvedValue(run)
  render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[{ pathname: `/activity/runs/${run.id}`, state }]}>
          <Routes>
            <Route path="/activity/runs/:id" element={<RunDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getJobCatalog).mockResolvedValue(catalog)
  vi.mocked(getUiConfig).mockResolvedValue({ grafana_url: 'https://grafana.example' })
})
afterEach(cleanup)

describe('run detail for a launcher run', () => {
  it('returns to Jobs when opened from Jobs', async () => {
    openRun(runDetailFixture, { from: 'jobs' })
    expect((await screen.findByRole('link', { name: '← Jobs' })).getAttribute('href')).toBe('/jobs')
    expect(screen.getByRole('heading', { level: 1, name: 'Jobs' })).toBeTruthy()
  })

  it('returns to the run list otherwise', async () => {
    openRun(runDetailFixture)
    expect((await screen.findByRole('link', { name: '← All runs' })).getAttribute('href')).toBe('/activity?tab=runs')
  })

  it('shows the attempt against the catalog limit', async () => {
    openRun(runDetailFixture)
    expect(await screen.findByText('Attempt 3 of 3')).toBeTruthy()
  })

  it('shows the attempt alone when the catalog is unavailable', async () => {
    vi.mocked(getJobCatalog).mockRejectedValue(new Error('down'))
    openRun(runDetailFixture)
    expect(await screen.findByText('Attempt 3')).toBeTruthy()
  })

  it('links a step to its chain', async () => {
    openRun(runDetailFixture)
    expect((await screen.findByRole('link', { name: 'sample-weekly' })).getAttribute('href')).toBe('/jobs#chain-sample-weekly')
  })

  it('links a chain root to its own chain', async () => {
    openRun(chainRootFixture)
    expect((await screen.findByRole('link', { name: 'sample-weekly' })).getAttribute('href')).toBe('/jobs#chain-sample-weekly')
  })

  it('shows the timeline and the facts', async () => {
    openRun({ ...runDetailFixture, requested_by: 'sample-operator', trigger: { params: { week: 7 }, downstream: false } })
    expect(await screen.findByText('Status timeline')).toBeTruthy()
    expect(screen.getByText('sample-operator')).toBeTruthy()
    expect(screen.getByText('week: 7')).toBeTruthy()
  })

  it('never prints launcher trigger params as an object', async () => {
    openRun(runDetailFixture)
    await screen.findByText('Status timeline')
    expect(document.body.textContent).not.toContain('[object Object]')
  })

  it('leaves the launcher downstream flag out of the trigger details', async () => {
    openRun(runDetailFixture)
    await screen.findByText('Status timeline')
    expect(screen.queryByText(/downstream: false/)).toBeNull()
  })

  it('does not claim there is no outcome when a bot left only counters and a result', async () => {
    openRun({ ...runDetailFixture, error: null, summary: { offersStaged: 2, result: { status: 'proposal' } } })
    expect(await screen.findByText('offersStaged')).toBeTruthy()
    expect(screen.queryByText('This run recorded no outcome.')).toBeNull()
  })

  it('says so when a run recorded nothing at all', async () => {
    openRun({ ...runDetailFixture, error: null, summary: {} })
    expect(await screen.findByText('This run recorded no outcome.')).toBeTruthy()
  })

  it('offers Grafana in the log panel', async () => {
    openRun(runDetailFixture)
    expect(await screen.findByRole('link', { name: 'Open in Grafana' })).toBeTruthy()
  })

  it('offers Grafana even when no log lines were captured', async () => {
    openRun({ ...runDetailFixture, summary: {} })
    expect(await screen.findByRole('link', { name: 'Open in Grafana' })).toBeTruthy()
  })

  it('lists child runs with their sessions', async () => {
    openRun(runDetailFixture)
    expect(await screen.findByRole('link', { name: 'Open LLM session: Sample claim reasoning' })).toBeTruthy()
  })

  it('keeps polling a queued run', async () => {
    openRun({ ...runDetailFixture, status: 'queued', finished_at: null })
    await screen.findByText('Status timeline')
    const query = queryClient.getQueryCache().find({ queryKey: ['run', runDetailFixture.id] })
    const interval = query?.observers[0]?.options.refetchInterval
    expect(typeof interval === 'function' ? interval(query!) : interval).toBeTruthy()
  })
})

describe('runs tab with launcher values', () => {
  function openPanel() {
    vi.mocked(getJobs).mockResolvedValue({ items: [], dead_letters: [] })
    vi.mocked(getRuns).mockResolvedValue({ items: [{ ...runDetailFixture, status: 'cancelled' }] })
    render(
      <MantineProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter><RunsPanel /></MemoryRouter>
        </QueryClientProvider>
      </MantineProvider>,
    )
  }

  it('labels a chain trigger and a cancelled run', async () => {
    openPanel()
    const row = (await screen.findByRole('link', { name: 'claim-waivers' })).closest('tr')!
    expect(within(row).getByText('Chain')).toBeTruthy()
    expect(within(row).getByText('cancelled')).toBeTruthy()
  })

  it('offers only the trigger filters the API accepts', async () => {
    openPanel()
    await screen.findByRole('link', { name: 'claim-waivers' })
    fireEvent.click(screen.getByPlaceholderText('Any trigger'))
    const options = (await screen.findAllByRole('option', { hidden: true })).map((option) => option.textContent)
    expect(options).toEqual(expect.arrayContaining(['Scheduled', 'Manual']))
    expect(options).toEqual(expect.not.arrayContaining(['Chain', 'Event', 'CLI', 'MCP']))
  })
})
