import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { ApiError } from '../../api/client'
import { pauseJob, resumeJob } from '../../api/jobs'
import { pauseFixture } from './fixtures'
import { PauseControl } from './PauseControl'
import { renderForTest } from './renderForTest'

vi.mock('../../api/jobs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/jobs')>()),
  pauseJob: vi.fn(),
  resumeJob: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(pauseJob).mockResolvedValue({ name: 'sync-rumors', paused_until: null, reason: 'Bye week' })
  vi.mocked(resumeJob).mockResolvedValue({ name: 'sync-rumors', status: 'resumed' })
})
afterEach(cleanup)

const NOW = new Date('2026-11-03T22:22:00Z')

describe('PauseControl', () => {
  it('pauses a job through the dialog', async () => {
    renderForTest(<PauseControl name="sync-rumors" pause={null} target="job" now={NOW} />)
    fireEvent.click(screen.getByRole('button', { name: 'Pause…' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Until resumed' }))
    fireEvent.change(screen.getByRole('textbox', { name: /Reason/ }), { target: { value: 'Bye week' } })
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    await waitFor(() => expect(pauseJob).toHaveBeenCalledWith('sync-rumors', { until: null, reason: 'Bye week' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('shows an active pause with who set it, and resumes', async () => {
    renderForTest(<PauseControl name="sync-rumors" pause={pauseFixture('sync-rumors')} target="job" now={NOW} />)
    expect(screen.getByText(/^Paused until .* · Bye week · by sample-operator$/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Pause…' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    await waitFor(() => expect(resumeJob).toHaveBeenCalledWith('sync-rumors', expect.anything()))
  })

  it('offers Pause again once a pause has run out', () => {
    renderForTest(<PauseControl name="sync-rumors" pause={pauseFixture('sync-rumors', '2026-11-01T00:00:00Z')} target="job" now={NOW} />)
    expect(screen.getByRole('button', { name: 'Pause…' })).toBeTruthy()
  })

  it('names the chain on its buttons', () => {
    renderForTest(<PauseControl name="sample-weekly" pause={pauseFixture('sample-weekly', null)} target="chain" now={NOW} />)
    expect(screen.getByText(/^Paused until resumed/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Resume chain' })).toBeTruthy()
  })

  it('says why a resume failed', async () => {
    vi.mocked(resumeJob).mockRejectedValue(new ApiError(404, 'sync-rumors'))
    renderForTest(<PauseControl name="sync-rumors" pause={pauseFixture('sync-rumors', null)} target="job" now={NOW} />)
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Not resumed: sync-rumors')
  })
})
