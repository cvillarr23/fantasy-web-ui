import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { ApiError } from '../../api/client'
import { PauseDialog } from './PauseDialog'

const meta = {
  title: 'Jobs/Pause dialog',
  component: PauseDialog,
  args: { opened: true, name: 'sync-rumors', target: 'job', pausing: false, error: null, onConfirm: fn(), onClose: fn() },
} satisfies Meta<typeof PauseDialog>
export default meta
type Story = StoryObj<typeof meta>

export const Job: Story = {
  play: async ({ canvasElement, args }) => {
    const body = within(canvasElement.ownerDocument.body)
    const pause = await body.findByRole('button', { name: 'Pause' })
    await expect(pause).toBeDisabled()
    await userEvent.click(body.getByRole('radio', { name: 'Until resumed' }))
    await userEvent.type(body.getByRole('textbox', { name: /Reason/ }), 'Bye week')
    await userEvent.click(pause)
    await expect(args.onConfirm).toHaveBeenCalledWith({ until: null, reason: 'Bye week' })
  },
}
export const Chain: Story = { args: { name: 'sample-weekly', target: 'chain' } }
export const CustomTime: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(await body.findByRole('radio', { name: 'Until…' }))
    await expect(body.getByLabelText('Resume at')).toBeVisible()
  },
}
export const Pausing: Story = { args: { pausing: true } }
export const Refused: Story = { args: { error: new ApiError(422, 'until must be in the future') } }
