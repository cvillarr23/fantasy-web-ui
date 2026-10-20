import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { palette } from '../../theme'
import { StrengthChip } from './StrengthChip'

const meta = { title: 'UI/StrengthChip', component: StrengthChip, args: { value: 1.3, info: true } } satisfies Meta<typeof StrengthChip>
export default meta
type Story = StoryObj<typeof meta>
export const Strong: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText('Strength ▲ +1.30 strong')).toBeVisible()
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
    await userEvent.pointer({ keys: '[TouchA]', target: canvas.getByRole('button') })
    await waitFor(() => expect(within(canvasElement.ownerDocument.body).getByRole('tooltip')).toBeVisible())
    await userEvent.pointer({ keys: '[TouchA]', target: canvas.getByRole('button') })
    await waitFor(() => expect(within(canvasElement.ownerDocument.body).queryByRole('tooltip')).not.toBeInTheDocument())
  },
}

export const PositiveAverage: Story = {
  args: { value: 0.42 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Strength ▲ +0.42 average').parentElement).toHaveStyle({ color: palette.outgoing })
  },
}
export const NegativeAverage: Story = {
  args: { value: -0.42 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Strength ▼ -0.42 average').parentElement).toHaveStyle({ color: palette.projected })
  },
}
export const DeadBand: Story = {
  args: { value: 0.05 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Strength ▲ +0.05 average').parentElement).toHaveStyle({ color: palette.secondary })
  },
}
export const NegativeDeadBand: Story = {
  args: { value: -0.05 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Strength ▼ -0.05 average').parentElement).toHaveStyle({ color: palette.secondary })
  },
}
export const RoundedStrong: Story = { args: { value: 0.496 } }
export const RoundedWeak: Story = { args: { value: -0.496 } }
export const TableValue: Story = {
  args: { info: false },
  play: async ({ canvas }) => { await expect(canvas.queryByRole('button')).not.toBeInTheDocument() },
}
