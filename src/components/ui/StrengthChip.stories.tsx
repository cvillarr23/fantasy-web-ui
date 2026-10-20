import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { StrengthChip } from './StrengthChip'

const meta = { title: 'UI/StrengthChip', component: StrengthChip, args: { value: 1.3 } } satisfies Meta<typeof StrengthChip>
export default meta
type Story = StoryObj<typeof meta>
export const Strong: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText('Strength ▲ +1.3 strong')).toBeVisible()
    await userEvent.hover(canvas.getByRole('button'))
    await waitFor(() => expect(within(canvasElement.ownerDocument.body).getByRole('tooltip')).toBeVisible())
  },
}
export const Weak: Story = { args: { value: -1.1 } }
export const Average: Story = { args: { value: 0.1 } }
export const Neutral: Story = { args: { value: 0 } }
export const StrongBoundary: Story = { args: { value: 0.5 } }
export const WeakBoundary: Story = { args: { value: -0.5 } }
export const Unknown: Story = { args: { value: null } }
export const Keyboard: Story = {
  play: async ({ canvas, canvasElement }) => {
    await userEvent.tab()
    await expect(canvas.getByRole('button')).toHaveFocus()
    await waitFor(() => expect(within(canvasElement.ownerDocument.body).getByRole('tooltip')).toBeVisible())
  },
}
export const Phone: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvasElement.ownerDocument.defaultView!.innerWidth).toBeLessThanOrEqual(480)
    await userEvent.click(canvas.getByRole('button'))
    await waitFor(() => expect(within(canvasElement.ownerDocument.body).getByRole('tooltip')).toBeVisible())
  },
}
