import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { MatchupTeamCard } from './MatchupTeamCard'
import { matchupFixture } from './fixtures'

const { our_team, opponent } = matchupFixture()

const meta = {
  title: 'Matchup/Team card', component: MatchupTeamCard,
  args: { id: 'matchup-yours', label: 'Your team', side: our_team },
} satisfies Meta<typeof MatchupTeamCard>
export default meta
type Story = StoryObj<typeof meta>

/** Sample Receiver B is projected for 0.0 and flagged; the kicker and defense have no score yet. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Projected 0.0')).toBeVisible()
    await userEvent.click(canvas.getByText('Bench (4)'))
  },
}
export const Opponent: Story = { args: { label: 'Opponent', side: opponent, id: 'matchup-theirs' } }
export const EmptyBench: Story = { args: { side: { ...our_team, bench: [] } } }
export const Phone: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: 'Projected 0.0' })).toBeVisible()
    await expect(canvas.getByText('FLEX · WR')).toBeVisible()
  },
}
