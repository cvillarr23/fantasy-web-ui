import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { BadgeSlot } from './BadgeSlot'

const meta = {
  title: 'UI/BadgeSlot',
  component: BadgeSlot,
  args: { label: 'swap?', color: 'blue', variant: 'light', size: 'xs' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['filled', 'light', 'outline'] },
    size: { control: 'inline-radio', options: ['xs', 'sm'] },
    color: { control: 'select', options: ['gray', 'blue', 'green', 'yellow', 'orange', 'red', 'violet'] },
  },
} satisfies Meta<typeof BadgeSlot>

export default meta
type Story = StoryObj<typeof meta>

export const Plain: Story = {}

export const WithTooltip: Story = {
  args: { tooltip: 'Explains the badge on hover' },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.hover(canvas.getByText('swap?'))
    await expect(await within(canvasElement.ownerDocument.body).findByText('Explains the badge on hover')).toBeInTheDocument()
  },
}

export const Filled: Story = { args: { label: 'IR', color: 'red', variant: 'filled' } }
