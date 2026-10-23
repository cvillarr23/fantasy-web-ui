import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { mockFetch } from '../../.storybook/mockFetch'
import { RosterDeficitsGrid } from './RosterDeficitsGrid'
import { lineupDeficits, lineupTeamNames } from './lineupFixtures'

const meta = {
  title: 'Lineup/RosterDeficitsGrid', component: RosterDeficitsGrid,
  args: { deficits: lineupDeficits, myTeamId: '7' },
  beforeEach: () => mockFetch([{ path: /\/v1\/league\/teams/, body: lineupTeamNames }]),
} satisfies Meta<typeof RosterDeficitsGrid>
export default meta
type Story = StoryObj<typeof meta>

export const ShortAtOnePosition: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Short 1')).toBeVisible()
    await expect(canvas.getByText('Covered, 3 spare')).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Look for a trade' })).toBeVisible()
    await expect(await canvas.findByRole('rowheader', { name: 'Fourth and Long' })).toBeVisible()
  },
}
export const AllCovered: Story = {
  args: { deficits: { ...lineupDeficits, teams: { ...lineupDeficits.teams, '7': { ...lineupDeficits.teams['7'], TE: { rostered: 2, starters_required: 2, deficit: 0, net_vorp: 1 } } } } },
  play: async ({ canvas }) => { await expect(canvas.queryByRole('link', { name: 'Look for a trade' })).toBeNull() },
}
export const Loading: Story = {
  args: { deficits: null, loading: true },
  play: async ({ canvas }) => { await expect(canvas.getByRole('status', { name: 'Loading roster deficits' })).toBeVisible() },
}
export const Updating: Story = {
  args: { updating: true },
  play: async ({ canvasElement }) => { await expect(canvasElement.querySelector('[aria-busy="true"]')).not.toBeNull() },
}
export const Empty: Story = {
  args: { deficits: { ...lineupDeficits, teams: {} } },
  play: async ({ canvas }) => { await expect(canvas.getByText('No roster data yet for this league/week.')).toBeVisible() },
}
export const Phone: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  play: async ({ canvas }) => { await expect(await canvas.findByText('Short 1')).toBeVisible() },
}
