import type { Meta, StoryObj } from '@storybook/react-vite'
import { MatchupBadge, ScarcityBadge } from './DraftSignalBadges'

const meta = {
  title: 'Player/DraftSignalBadges',
  component: ScarcityBadge,
  args: { isScarce: true },
} satisfies Meta<typeof ScarcityBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Scarcity: Story = {}
export const Matchup: Story = { render: () => <MatchupBadge coefficient={1.18} /> }

/** An unknown matchup coefficient renders nothing. */
export const MatchupUnknown: Story = { render: () => <MatchupBadge coefficient={null} /> }
