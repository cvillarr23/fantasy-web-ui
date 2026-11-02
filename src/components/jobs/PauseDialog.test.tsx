import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { ApiError } from '../../api/client'
import { PauseDialog } from './PauseDialog'
import { renderForTest } from './renderForTest'

afterEach(cleanup)

const NOW = new Date('2026-11-03T22:22:00Z')

function renderDialog(props: Partial<Parameters<typeof PauseDialog>[0]> = {}) {
  const onConfirm = vi.fn()
  renderForTest(
    <PauseDialog opened name="sync-rumors" target="job" pausing={false} error={null} now={() => NOW} onConfirm={onConfirm} onClose={vi.fn()} {...props} />,
  )
  return { onConfirm }
}

/** A time as a datetime-local input writes it, in this machine's zone. */
const localInput = (at: Date) => new Date(at.getTime() - at.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
const reason = (text: string) => fireEvent.change(screen.getByRole('textbox', { name: /Reason/ }), { target: { value: text } })
const pauseButton = () => screen.getByRole('button', { name: 'Pause' }) as HTMLButtonElement

describe('PauseDialog', () => {
  it('needs a reason before it pauses', () => {
    renderDialog()
    expect(pauseButton().disabled).toBe(true)
    reason('   ')
    expect(pauseButton().disabled).toBe(true)
    reason('Bye week')
    expect(pauseButton().disabled).toBe(false)
  })

  it.each([
    ['1 hour', '2026-11-03T23:22:00.000Z'],
    ['1 day', '2026-11-04T22:22:00.000Z'],
    ['1 week', '2026-11-10T22:22:00.000Z'],
  ])('pauses for %s from now', (label, until) => {
    const { onConfirm } = renderDialog()
    fireEvent.click(screen.getByRole('radio', { name: label }))
    reason(' Bye week ')
    fireEvent.click(pauseButton())
    expect(onConfirm).toHaveBeenCalledWith({ until, reason: 'Bye week' })
  })

  it('counts the time from the click, not from when the dialog opened', () => {
    let now = NOW
    const { onConfirm } = renderDialog({ now: () => now })
    fireEvent.click(screen.getByRole('radio', { name: '1 hour' }))
    reason('Bye week')
    now = new Date(NOW.getTime() + 40 * 60_000)
    fireEvent.click(pauseButton())
    expect(onConfirm).toHaveBeenCalledWith({ until: '2026-11-04T00:02:00.000Z', reason: 'Bye week' })
  })

  it('flags a custom time that passed while the dialog was open, and does not pause', () => {
    let now = NOW
    const { onConfirm } = renderDialog({ now: () => now })
    fireEvent.click(screen.getByRole('radio', { name: 'Until…' }))
    reason('Bye week')
    const at = new Date(NOW.getTime() + 10 * 60_000)
    fireEvent.change(screen.getByLabelText('Resume at'), { target: { value: localInput(at) } })
    now = new Date(NOW.getTime() + 20 * 60_000)
    fireEvent.click(pauseButton())
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByText('Pick a time in the future')).toBeTruthy()
  })

  it('locks the form while the pause is being saved', () => {
    renderDialog({ pausing: true })
    expect((screen.getByRole('textbox', { name: /Reason/ }) as HTMLTextAreaElement).disabled).toBe(true)
    expect((screen.getByRole('radio', { name: '1 hour' }) as HTMLInputElement).disabled).toBe(true)
  })

  it('pauses until resumed with no end time', () => {
    const { onConfirm } = renderDialog()
    fireEvent.click(screen.getByRole('radio', { name: 'Until resumed' }))
    reason('Off-season')
    fireEvent.click(pauseButton())
    expect(onConfirm).toHaveBeenCalledWith({ until: null, reason: 'Off-season' })
  })

  it('takes a custom time in the future only', () => {
    const { onConfirm } = renderDialog()
    fireEvent.click(screen.getByRole('radio', { name: 'Until…' }))
    reason('Bye week')
    const at = screen.getByLabelText('Resume at')
    fireEvent.change(at, { target: { value: '2026-11-01T09:00' } })
    expect(screen.getByText('Pick a time in the future')).toBeTruthy()
    expect(pauseButton().disabled).toBe(true)
    fireEvent.change(at, { target: { value: '2026-11-20T09:00' } })
    fireEvent.click(pauseButton())
    expect(onConfirm).toHaveBeenCalledWith({ until: new Date('2026-11-20T09:00').toISOString(), reason: 'Bye week' })
  })

  it('says what a pause skips for a chain', () => {
    renderDialog({ name: 'sample-weekly', target: 'chain' })
    expect(screen.getByRole('dialog').textContent).toContain("The chain's scheduled runs are skipped")
  })

  it('shows why core refused the pause', () => {
    renderDialog({ error: new ApiError(422, 'until must be in the future') })
    expect(screen.getByRole('alert').textContent).toContain('Not paused: until must be in the future')
  })
})
