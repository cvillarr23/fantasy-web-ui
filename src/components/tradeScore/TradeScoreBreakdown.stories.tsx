import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { TradeScoreBreakdown } from './TradeScoreBreakdown'
import { completeScore, partialScore, unscoredScore } from './fixtures'

const teamNames = { '3': 'Strong Opponent', '5': 'Weak Opponent', '7': 'Our Team', '8': 'Rival Team' }

/** Shows core's deterministic trade score and its evidence. The UI never rescores. */
const meta = {
  title: 'Trade score/TradeScoreBreakdown',
  component: TradeScoreBreakdown,
  args: { score: completeScore(), teamNames },
} satisfies Meta<typeof TradeScoreBreakdown>

export default meta
type Story = StoryObj<typeof meta>

export const Complete: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('table', { name: 'Score terms' })).toBeVisible()
  },
}

export const PartialHorizon: Story = { args: { score: partialScore() } }

/** No scored weeks: every term is unknown and shows "—" or an explanation, not zero. */
export const Unscored: Story = { args: { score: unscoredScore() } }

/** Without team names the breakdown falls back to team IDs. */
export const NoTeamNames: Story = { args: { teamNames: undefined } }
