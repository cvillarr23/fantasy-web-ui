import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { LeagueNotConfigured } from './LeagueNotConfigured'

const meta = { title: 'UI/LeagueNotConfigured', component: LeagueNotConfigured } satisfies Meta<typeof LeagueNotConfigured>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'Go to Settings' })).toHaveAttribute('href', '/settings')
  },
}
