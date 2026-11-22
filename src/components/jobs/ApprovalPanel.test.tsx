import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { ApiError } from '../../api/client'
import { approveRun, dismissRun } from '../../api/jobs'
import { ApprovalPanel } from './ApprovalPanel'
import { chainApprovalFixture, tradeApprovalFixture } from './fixtures'
import { renderForTest } from './renderForTest'

vi.mock('../../api/jobs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/jobs')>()),
  approveRun: vi.fn(),
  dismissRun: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(approveRun).mockResolvedValue({ run_id: 'run-approve-lineup', status: 'success', end_reason: 'approved' })
  vi.mocked(dismissRun).mockResolvedValue({ run_id: 'run-approve-lineup', status: 'skipped', end_reason: 'dismissed' })
})
afterEach(cleanup)

describe('ApprovalPanel for a chain step', () => {
  it('shows what waits for you and when it expires', () => {
    renderForTest(<ApprovalPanel run={chainApprovalFixture} />)
    expect(screen.getByRole('heading', { name: 'Approve lineup changes' })).toBeTruthy()
    expect(screen.getByText(/^Waiting for you\. Expires /)).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Open' })).toBeNull()
  })

  it('asks before approving, then approves the run', async () => {
    renderForTest(<ApprovalPanel run={chainApprovalFixture} />)
    fireEvent.click(screen.getByRole('button', { name: 'Approve, Approve lineup changes' }))
    expect(screen.getByRole('dialog').textContent).toContain('The steps that follow it go on.')
    expect(approveRun).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    await waitFor(() => expect(approveRun).toHaveBeenCalledWith('run-approve-lineup', expect.anything()))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('asks before dismissing, says what it skips, then dismisses the run', async () => {
    renderForTest(<ApprovalPanel run={chainApprovalFixture} />)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss, Approve lineup changes' }))
    expect(screen.getByRole('dialog').textContent).toContain('the steps that follow it are skipped')
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    await waitFor(() => expect(dismissRun).toHaveBeenCalledWith('run-approve-lineup', expect.anything()))
    expect(approveRun).not.toHaveBeenCalled()
  })

  it('does nothing when told not yet', () => {
    renderForTest(<ApprovalPanel run={chainApprovalFixture} />)
    fireEvent.click(screen.getByRole('button', { name: 'Approve, Approve lineup changes' }))
    fireEvent.click(screen.getByRole('button', { name: 'Not yet' }))
    expect(approveRun).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('keeps the dialog open with the reason when the approval already ended', async () => {
    vi.mocked(approveRun).mockRejectedValue(new ApiError(409, 'Approval is no longer waiting.'))
    renderForTest(<ApprovalPanel run={chainApprovalFixture} />)
    fireEvent.click(screen.getByRole('button', { name: 'Approve, Approve lineup changes' }))
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Not approved: Approval is no longer waiting.')
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('has no buttons once decided, and says how it ended', () => {
    const run = { ...chainApprovalFixture, status: 'success' as const, end_reason: 'approved', requested_by: 'sam' }
    renderForTest(<ApprovalPanel run={run} />)
    expect(screen.getByText('Approved by sam.')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('ApprovalPanel for a trade offer', () => {
  it('links to the Trades page and offers no decision here', () => {
    renderForTest(<ApprovalPanel run={tradeApprovalFixture} />)
    expect(screen.getByRole('link', { name: 'Open' }).getAttribute('href')).toBe(`/trades?offer=${'a'.repeat(64)}`)
    expect(screen.getByText(/^Approving starts trade-submit \(offer key: a+\)\./)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Approve/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Dismiss/ })).toBeNull()
  })

  it('says a replaced offer was replaced', () => {
    renderForTest(<ApprovalPanel run={{ ...tradeApprovalFixture, status: 'skipped', end_reason: 'superseded' }} />)
    expect(screen.getByText('Replaced by a newer approval.')).toBeTruthy()
  })
})
