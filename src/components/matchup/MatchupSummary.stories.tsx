import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { MatchupSummary } from './MatchupSummary'
import { matchupFixture } from './fixtures'

const { our_team, opponent } = matchupFixture()

const meta = {
  title: 'Matchup/Summary', component: MatchupSummary,
  args: { ours: our_team.team, opponent: opponent.team },
} satisfies Meta<typeof MatchupSummary>
export default meta
type Story = StoryObj<typeof meta>

export const Leading: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('+8.6')).toBeVisible()
    await expect(canvas.getByText('~63%')).toBeVisible()
  },
}
export const Trailing: Story = {
  args: { opponent: { ...opponent.team, projected: 140 } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('-21.8')).toBeVisible()
    await expect(canvas.getByText('~19%')).toBeVisible()
  },
}
/** Nothing scored and no projection: dashes and "Not available", never zero. */
export const Unknown: Story = {
  args: { ours: { ...our_team.team, score: 0, projected: null }, opponent: { ...opponent.team, score: 0, projected: null } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Not available')).toBeVisible()
    await expect(canvas.queryByText('0.0')).toBeNull()
  },
}
export const Phone: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
}
