import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { ErrorAlert } from './ErrorAlert'

const meta = {
  title: 'UI/ErrorAlert',
  component: ErrorAlert,
  args: { children: 'Could not load free agents: ESPN timed out.' },
} satisfies Meta<typeof ErrorAlert>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithRetry: Story = {
  args: { onRetry: fn() },
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Retry' }))
    await expect(args.onRetry).toHaveBeenCalled()
  },
}

/** When earlier data is still on screen, say so. */
export const StaleData: Story = {
  args: { children: 'Could not load outgoing proposals: Bad gateway. Previously loaded proposals are shown below and may be out of date.' },
}
