import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { catalogFixture } from './fixtures'
import { RunConfirmDialog } from './RunConfirmDialog'
import { renderForTest } from './renderForTest'

afterEach(cleanup)

const job = (name: string) => catalogFixture.jobs.find((j) => j.name === name)!

function renderDialog(props: Partial<Parameters<typeof RunConfirmDialog>[0]> = {}) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  renderForTest(
    <RunConfirmDialog opened job={job('set-lineup')} catalog={catalogFixture} downstream={false} params={{}} starting={false} onConfirm={onConfirm} onCancel={onCancel} {...props} />,
  )
  return { onConfirm, onCancel, dialog: within(screen.getByRole('dialog')) }
}

describe('RunConfirmDialog', () => {
  it('warns that the run can change the team', () => {
    const { dialog } = renderDialog()
    expect(dialog.getByText('This run can change your team on ESPN.')).toBeTruthy()
  })

  it('names what each acting step does', () => {
    const { dialog } = renderDialog()
    expect(dialog.getByText('set-lineup')).toBeTruthy()
  })

  it('keeps Start run off until the box is ticked', () => {
    const { dialog, onConfirm } = renderDialog()
    const start = dialog.getByRole('button', { name: 'Start run' })
    expect(start.hasAttribute('disabled')).toBe(true)
    fireEvent.click(start)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('confirms once ticked', () => {
    const { dialog, onConfirm } = renderDialog()
    fireEvent.click(dialog.getByRole('checkbox', { name: /checked what this run will do/ }))
    fireEvent.click(dialog.getByRole('button', { name: 'Start run' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('cancels', () => {
    const { dialog, onCancel } = renderDialog()
    fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('lists later acting steps when a quiet job runs with downstream', () => {
    const { dialog } = renderDialog({ job: job('sync-sample'), downstream: true })
    expect(dialog.getByText("This job doesn't change your team, but later steps can.")).toBeTruthy()
    expect(dialog.getByText('Runs 5 steps of sample-weekly, starting now.')).toBeTruthy()
    expect(dialog.getByText('set-lineup')).toBeTruthy()
    expect(dialog.getByText('claim-waivers')).toBeTruthy()
  })

  it('says parameters stop at the first step, so a dry run does not cover later steps', () => {
    const { dialog } = renderDialog({ downstream: true, params: { dry_run: true } })
    expect(dialog.getByText('Parameters apply to set-lineup only. Later steps run for real.')).toBeTruthy()
  })

  it('says when a lone dry run will not publish', () => {
    const { dialog } = renderDialog({ params: { dry_run: true } })
    expect(dialog.getByText(/Dry run is on/)).toBeTruthy()
  })

  it('locks while the run is starting', () => {
    const { dialog } = renderDialog({ starting: true })
    expect(dialog.getByRole('button', { name: 'Cancel' }).hasAttribute('disabled')).toBe(true)
  })

  it('forgets the tick when reopened', () => {
    const { dialog } = renderDialog()
    fireEvent.click(dialog.getByRole('checkbox'))
    fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }))
    cleanup()
    const reopened = renderDialog()
    expect(reopened.dialog.getByRole('button', { name: 'Start run' }).hasAttribute('disabled')).toBe(true)
  })
})
