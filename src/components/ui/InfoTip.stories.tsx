import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { InfoTip } from './InfoTip'
import { tradeGlossary } from '../tradeScore/tradeGlossary'

const meta = {
  title: 'UI/InfoTip', component: InfoTip,
  args: { label: 'strength', children: tradeGlossary.strength },
} satisfies Meta<typeof InfoTip>
export default meta
type Story = StoryObj<typeof meta>

export const Hover: Story = {
  play: async ({ canvas, canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    await userEvent.hover(canvas.getByRole('button', { name: 'What is strength?' }))
    await expect(await page.findByRole('tooltip')).toHaveTextContent(tradeGlossary.strength)
    await expect(page.getByRole('tooltip')).toHaveAttribute('id', canvas.getByRole('button').getAttribute('aria-describedby'))
    await userEvent.unhover(canvas.getByRole('button'))
    await waitFor(() => expect(page.queryByRole('tooltip')).not.toBeInTheDocument())
  },
}
export const Keyboard: Story = {
  play: async ({ canvas, canvasElement }) => {
    await userEvent.tab()
    await expect(canvas.getByRole('button')).toHaveFocus()
    const page = within(canvasElement.ownerDocument.body)
    await waitFor(() => expect(page.getByRole('tooltip')).toBeVisible())
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(page.queryByRole('tooltip')).not.toBeInTheDocument())
  },
}
export const Phone: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvasElement.ownerDocument.defaultView!.innerWidth).toBeLessThanOrEqual(480)
    const page = within(canvasElement.ownerDocument.body)
    await userEvent.click(canvas.getByRole('button'))
    await waitFor(() => expect(page.getByRole('tooltip')).toBeVisible())
    await userEvent.click(canvas.getByRole('button'))
    await waitFor(() => expect(page.queryByRole('tooltip')).not.toBeInTheDocument())
  },
}
