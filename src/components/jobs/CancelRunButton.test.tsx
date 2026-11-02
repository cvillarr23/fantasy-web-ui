import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { ApiError } from '../../api/client'
import { cancelRun } from '../../api/jobs'
import { CancelRunButton } from './CancelRunButton'
import { renderForTest } from './renderForTest'

vi.mock('../../api/jobs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/jobs')>()),
  cancelRun: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(cancelRun).mockResolvedValue({ run_id: 'run-1', status: 'cancelled' })
})
afterEach(cleanup)

const RUNNING = { id: 'run-1', status: 'running' }

const openDialog = (props: Partial<Parameters<typeof CancelRunButton>[0]> = {}) => {
  renderForTest(<CancelRunButton run={RUNNING} job="set-lineup" {...props} />)
  fireEvent.click(screen.getByRole('button', { name: /^Cancel/ }))
  return screen.getByRole('dialog')
}

describe('CancelRunButton', () => {
  it('asks before cancelling, and keeps the run when told to', () => {
    const dialog = openDialog()
    expect(dialog.textContent).toContain('Cancel this set-lineup run?')
    expect(dialog.textContent).toContain('The launcher stops its pod or process.')
    fireEvent.click(screen.getByRole('button', { name: 'Keep running' }))
    expect(cancelRun).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('cancels the run once confirmed and closes', async () => {
    openDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel run' }))
    await waitFor(() => expect(cancelRun).toHaveBeenCalledWith('run-1', expect.anything()))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('says a chain run stops its active steps and starts no more', () => {
    const dialog = openDialog({ job: 'sample-weekly', chainRoot: true, label: 'Cancel chain run' })
    expect(dialog.textContent).toContain('Cancel the sample-weekly run?')
    expect(dialog.textContent).toContain("later steps won't start")
  })

  it('stays open with the reason when core refuses', async () => {
    vi.mocked(cancelRun).mockRejectedValue(new ApiError(409, 'success'))
    openDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel run' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Run not cancelled: success')
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('has no button for a run that has ended', () => {
    renderForTest(<CancelRunButton run={{ id: 'run-1', status: 'succeeded' }} job="set-lineup" />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('keeps the refusal open when the refresh shows the run ended', async () => {
    vi.mocked(cancelRun).mockRejectedValue(new ApiError(409, 'not cancellable'))
    const { rerender } = renderForTest(<CancelRunButton run={RUNNING} job="set-lineup" />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel, set-lineup' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel run' }))
    await screen.findByRole('alert')
    rerender(<CancelRunButton run={{ id: 'run-1', status: 'cancelled' }} job="set-lineup" />)
    expect(screen.getByRole('alert').textContent).toContain('Run not cancelled: not cancellable')
    fireEvent.click(screen.getByRole('button', { name: 'Keep running' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('cancels the run it opened on, not a newer one that arrived meanwhile', async () => {
    const { rerender } = renderForTest(<CancelRunButton run={RUNNING} job="set-lineup" />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel, set-lineup' }))
    rerender(<CancelRunButton run={{ id: 'run-2', status: 'queued' }} job="set-lineup" />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel run' }))
    await waitFor(() => expect(cancelRun).toHaveBeenCalledWith('run-1', expect.anything()))
  })
})
