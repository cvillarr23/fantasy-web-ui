import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { ScoreValue } from './ScoreValue'

const meta = {
  title: 'UI/ScoreValue',
  component: ScoreValue,
  args: { value: 18.44, projected: false },
} satisfies Meta<typeof ScoreValue>

export default meta
type Story = StoryObj<typeof meta>

export const Actual: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Actual')).toBeVisible()
    await expect(canvas.getByText('18.4')).toBeVisible()
  },
}

export const Projected: Story = { args: { value: 21.06, projected: true } }

export const Unknown: Story = {
  args: { value: null },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('—')).toBeVisible()
  },
}
