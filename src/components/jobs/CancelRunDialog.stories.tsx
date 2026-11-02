import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, within } from 'storybook/test'
import { ApiError } from '../../api/client'
import { CancelRunDialog } from './CancelRunDialog'

const meta = {
  title: 'Jobs/Cancel run dialog',
  component: CancelRunDialog,
  args: { opened: true, job: 'set-lineup', cancelling: false, error: null, onConfirm: fn(), onClose: fn() },
} satisfies Meta<typeof CancelRunDialog>
export default meta
type Story = StoryObj<typeof meta>

export const Job: Story = {
  play: async ({ canvasElement, args }) => {
    const body = within(canvasElement.ownerDocument.body)
    ;(await body.findByRole('button', { name: 'Cancel run' })).click()
    await expect(args.onConfirm).toHaveBeenCalled()
  },
}
export const ChainRun: Story = { args: { job: 'sample-weekly', chainRoot: true } }
export const Cancelling: Story = { args: { cancelling: true } }
export const Refused: Story = { args: { error: new ApiError(409, 'success') } }
