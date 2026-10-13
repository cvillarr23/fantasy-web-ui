import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from '@mantine/core'
import { PlayerStatusBadges } from './PlayerStatusBadges'

const meta = {
  title: 'Player/PlayerStatusBadges',
  component: PlayerStatusBadges,
  args: {
    player: { injury_status: 'QUESTIONABLE', rumor_sentiment: 'negative', rumor_confidence: 0.6, rumor_suggested_action: 'consider_benching' },
  },
} satisfies Meta<typeof PlayerStatusBadges>

export default meta
type Story = StoryObj<typeof meta>

export const InjuryAndRumor: Story = {}
export const WithExtraBadge: Story = { args: { extra: <Badge color="yellow" size="xs">Move to IR</Badge> } }
export const Healthy: Story = {
  args: { player: { injury_status: 'ACTIVE', rumor_sentiment: null, rumor_confidence: null, rumor_suggested_action: null } },
}
