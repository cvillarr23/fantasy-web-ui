import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { TradeFinderTeamCards } from './TradeFinderTeamCards'
import { candidates, finderContext, finderDeficits } from './fixtures'
import './tradeFinder.css'
const meta = {
  title: 'Trade finder/TradeFinderTeamCards', component: TradeFinderTeamCards,
  args: { counts: candidates().team_counts, context: finderContext, deficits: finderDeficits, ourTeamId: '7', selectedTeamId: '', onSelect: fn() },
} satisfies Meta<typeof TradeFinderTeamCards>
export default meta
type Story = StoryObj<typeof meta>
export const AllTeams: Story = {}
export const SelectedTeam: Story = { args: { selectedTeamId: '8' } }
export const UnknownContext: Story = { args: { context: undefined, deficits: undefined } }
