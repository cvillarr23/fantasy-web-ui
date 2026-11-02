import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { ApiError } from '../api/client'
import { cancelRun, getJobCatalog, getLatestChainRun, getLauncherHealth, getRecentJobRuns, pauseJob, startJobRun } from '../api/jobs'
import { getRun } from '../api/runs'
import { catalogFixture, chainRootFixture, healthFixture } from './jobs/fixtures'
import { renderForTest } from './jobs/renderForTest'
import { JobsPage } from './JobsPage'

vi.mock('../api/jobs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/jobs')>()),
  getJobCatalog: vi.fn(),
  getLauncherHealth: vi.fn(),
  getLatestChainRun: vi.fn(),
  getRecentJobRuns: vi.fn(),
  startJobRun: vi.fn(),
  cancelRun: vi.fn(),
  pauseJob: vi.fn(),
}))
vi.mock('../api/runs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/runs')>()),
  getRun: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getJobCatalog).mockResolvedValue(catalogFixture)
  vi.mocked(getLauncherHealth).mockResolvedValue(healthFixture)
  vi.mocked(getLatestChainRun).mockResolvedValue(chainRootFixture)
  vi.mocked(getRun).mockResolvedValue(chainRootFixture)
  vi.mocked(getRecentJobRuns).mockResolvedValue([])
  vi.mocked(startJobRun).mockResolvedValue({ run_id: 'run-9', status: 'queued' })
  vi.mocked(cancelRun).mockResolvedValue({ run_id: 'run-score-sample', status: 'cancelled' })
  vi.mocked(pauseJob).mockResolvedValue({ name: 'sample-weekly', paused_until: null, reason: 'Off-season' })
})
afterEach(cleanup)

const open = (route = '/jobs') => renderForTest(<JobsPage />, route)
const row = async (name: string) => (await screen.findByRole('button', { name })).closest('tr')!

describe('JobsPage', () => {
  it('names the page and counts what needs attention', async () => {
    open()
    expect(screen.getByRole('heading', { level: 1, name: 'Jobs' })).toBeTruthy()
    expect(await screen.findByRole('link', { name: '8 jobs' })).toBeTruthy()
    expect(screen.getByRole('link', { name: '1 running or queued' })).toBeTruthy()
    expect(screen.getByRole('link', { name: '1 failed last run' })).toBeTruthy()
    expect(await screen.findByText('Launcher healthy · heartbeat 12s ago')).toBeTruthy()
  })

  it('warns when the launcher heartbeat is old', async () => {
    vi.mocked(getLauncherHealth).mockResolvedValue({ ...healthFixture, heartbeat_age_seconds: 420 })
    open()
    expect(await screen.findByText('Launcher quiet · heartbeat 7m ago')).toBeTruthy()
  })

  it('says when launcher status is unavailable', async () => {
    vi.mocked(getLauncherHealth).mockRejectedValue(new ApiError(503, 'no heartbeat'))
    open()
    expect(await screen.findByText('Launcher status unavailable')).toBeTruthy()
  })

  it('shows skeletons while loading', () => {
    vi.mocked(getJobCatalog).mockReturnValue(new Promise(() => {}))
    open()
    expect(screen.getByRole('status', { name: 'Loading jobs' })).toBeTruthy()
    expect(screen.getByRole('link', { name: '… jobs' })).toBeTruthy()
  })

  it('shows a failed load with Retry, not an empty table', async () => {
    vi.mocked(getJobCatalog).mockRejectedValue(new ApiError(500, 'boom'))
    open()
    expect((await screen.findByRole('alert')).textContent).toContain('Could not load jobs: boom')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
  })

  it('says when the catalog is empty', async () => {
    vi.mocked(getJobCatalog).mockResolvedValue({ jobs: [], chains: [] })
    open()
    expect(await screen.findByText(/No jobs in the catalog/)).toBeTruthy()
  })

  it('selects the job named in the address', async () => {
    open('/jobs?job=set-lineup')
    expect(await screen.findByRole('heading', { level: 3, name: 'set-lineup' })).toBeTruthy()
  })

  it('opens the rail from Run… without starting anything', async () => {
    open()
    fireEvent.click(within(await row('set-lineup')).getByRole('button', { name: 'Run…' }))
    expect(await screen.findByRole('heading', { level: 3, name: 'set-lineup' })).toBeTruthy()
    expect(startJobRun).not.toHaveBeenCalled()
  })

  it('starts a plain job from its row and reports the queued run', async () => {
    open()
    fireEvent.click(within(await row('sync-rumors')).getByRole('button', { name: 'Run' }))
    await waitFor(() => expect(startJobRun).toHaveBeenCalledWith('sync-rumors', { params: {}, downstream: false }))
    expect((await screen.findByRole('status', { name: '' })).textContent).toContain('Queued')
  })

  it('shows a clear error when core refuses with a 409', async () => {
    vi.mocked(startJobRun).mockRejectedValue(new ApiError(409, "A run for 'sync-rumors' is already running"))
    open()
    fireEvent.click(within(await row('sync-rumors')).getByRole('button', { name: 'Run' }))
    expect((await screen.findByRole('alert')).textContent).toContain('sync-rumors already has a run in progress')
  })

  it('brings the rail into view when a job is picked from a chain step', async () => {
    open()
    const scroll = vi.mocked(Element.prototype.scrollIntoView)
    const step = await screen.findByRole('button', { name: /^set-lineup, Waiting, affects team/ })
    scroll.mockClear()
    fireEvent.click(step)
    expect(scroll).toHaveBeenCalled()
  })

  it('draws the chain from its latest run', async () => {
    open()
    expect(await screen.findByRole('heading', { level: 2, name: 'sample-weekly' })).toBeTruthy()
    expect(await screen.findByText('Running · step 2 of 5')).toBeTruthy()
    expect(getRun).toHaveBeenCalledWith('root-1')
  })

  it('says when a chain has not run yet', async () => {
    vi.mocked(getLatestChainRun).mockResolvedValue(null)
    open()
    expect((await screen.findAllByText('No run yet')).length).toBeGreaterThan(0)
  })

  it('keeps the table when a chain run fails to load', async () => {
    vi.mocked(getLatestChainRun).mockRejectedValue(new ApiError(500, 'boom'))
    open()
    expect(await screen.findByText(/Could not load the latest sample-weekly run/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'sync-rumors' })).toBeTruthy()
  })

  it('cancels a running job from its row and refreshes the catalog', async () => {
    open()
    fireEvent.click(within(await row('score-sample')).getByRole('button', { name: 'Cancel, score-sample' }))
    const loads = vi.mocked(getJobCatalog).mock.calls.length
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel run' }))
    await waitFor(() => expect(cancelRun).toHaveBeenCalledWith('run-score-sample', expect.anything()))
    await waitFor(() => expect(vi.mocked(getJobCatalog).mock.calls.length).toBeGreaterThan(loads))
  })

  it('cancels a whole chain run from its panel', async () => {
    open()
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel chain run, sample-weekly' }))
    expect(screen.getByRole('dialog').textContent).toContain('Cancel the sample-weekly run?')
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel run' }))
    await waitFor(() => expect(cancelRun).toHaveBeenCalledWith('root-1', expect.anything()))
  })

  it('pauses a chain by its name', async () => {
    open()
    fireEvent.click(await screen.findByRole('button', { name: 'Pause chain…' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Until resumed' }))
    fireEvent.change(screen.getByRole('textbox', { name: /Reason/ }), { target: { value: 'Off-season' } })
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    await waitFor(() => expect(pauseJob).toHaveBeenCalledWith('sample-weekly', { until: null, reason: 'Off-season' }))
  })
})
