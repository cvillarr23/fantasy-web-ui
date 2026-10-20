import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { StatTile } from './StatTile'
import { tradeGlossary } from '../tradeScore/tradeGlossary'

const meta = {
  title: 'UI/StatTile', component: StatTile,
  args: { label: 'Our lineup gain', value: 12.4, info: tradeGlossary.ourLineupGain, caption: 'Over 4 scored weeks' },
} satisfies Meta<typeof StatTile>
export default meta
type Story = StoryObj<typeof meta>
export const Positive: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText('+12.4')).toBeVisible()
    await userEvent.hover(canvas.getByRole('button'))
    await waitFor(() => expect(within(canvasElement.ownerDocument.body).getByRole('tooltip')).toBeVisible())
  },
}
export const Negative: Story = { args: { value: -3.1 } }
export const Zero: Story = { args: { value: 0 } }
export const Unknown: Story = { args: { value: null } }
export const Minimal: Story = { args: { info: undefined, caption: undefined } }
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
