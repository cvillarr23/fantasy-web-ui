import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { brokenHeadshot, headshot } from '../../stories/fixtures'
import { PlayerAvatar } from './PlayerAvatar'

const meta = {
  title: 'Player/PlayerAvatar',
  component: PlayerAvatar,
  args: { name: 'Sample Quarterback', headshotUrl: headshot },
} satisfies Meta<typeof PlayerAvatar>

export default meta
type Story = StoryObj<typeof meta>

export const Headshot: Story = {}

/** When the image fails to load, the avatar falls back to initials. */
export const BrokenImage: Story = {
  args: { headshotUrl: brokenHeadshot },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('SQ')).toBeVisible()
  },
}
