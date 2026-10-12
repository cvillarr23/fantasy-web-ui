import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { RumorBadge } from './RumorBadge'

const meta = {
  title: 'Player/RumorBadge',
  component: RumorBadge,
  args: { sentiment: 'positive', confidence: 0.72, suggestedAction: 'start_with_caution' },
} satisfies Meta<typeof RumorBadge>

export default meta
type Story = StoryObj<typeof meta>

export const TrendingUp: Story = {}
export const TrendingDown: Story = { args: { sentiment: 'negative', confidence: 0.6, suggestedAction: 'consider_benching' } }
export const UnknownConfidence: Story = { args: { confidence: null, suggestedAction: null } }
export const UnrecognizedSentiment: Story = { args: { sentiment: 'mixed' } }

export const NoSignal: Story = {
  args: { sentiment: null },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('.mantine-Badge-root')).toBeNull()
  },
}
