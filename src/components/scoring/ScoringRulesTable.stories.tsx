import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { scoringRules } from './fixtures'
import { ScoringRulesTable } from './ScoringRulesTable'

const meta = {
  title: 'Scoring/Rules table', component: ScoringRulesTable,
  args: { rules: scoringRules.rules },
} satisfies Meta<typeof ScoringRulesTable>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('table', { name: "Your league's scoring rules" })).toBeVisible()
    await expect(canvas.getByText('1 pt per 10 rushing yds')).toBeVisible()
    await expect(canvas.getByText('−2 pts per fumble lost')).toHaveClass('scoring-rule-negative')
  },
}
/** A rule that applies to one position only is tagged with it. */
export const PositionRule: Story = {
  args: {
    rules: [
      ...scoringRules.rules,
      { ...scoringRules.rules[3], points_per: 0.2, rule_label: '1 pt per 5 rushing yds', position: 'QB' },
    ],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Rushing yards (QB)')).toBeVisible()
  },
}
