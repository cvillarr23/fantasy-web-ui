import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { ByeBadge } from './ByeBadge'

const meta = {
  title: 'Player/ByeBadge',
  component: ByeBadge,
  args: { byeWeek: 9, week: 7 },
} satisfies Meta<typeof ByeBadge>

export default meta
type Story = StoryObj<typeof meta>

/** Before the bye, a quiet reminder of when it is. */
export const Upcoming: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Bye Wk 9')).toBeVisible()
  },
}

/** In the bye week itself the player scores nothing, so the badge is loud. */
export const ThisWeek: Story = {
  args: { byeWeek: 7, week: 7 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('BYE')).toBeVisible()
  },
}

/** A bye that's already past, or an unknown one, renders nothing. */
export const Past: Story = {
  args: { byeWeek: 5, week: 7 },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('.mantine-Badge-root')).toBeNull()
  },
}
