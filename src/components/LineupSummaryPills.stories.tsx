import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { LineupSummaryPills } from './LineupSummaryPills'

const meta = {
  title: 'Lineup/LineupSummaryPills', component: LineupSummaryPills,
  args: { suggestedChanges: 2, injuredStarters: 1, byeCrunchWeeks: [9, 12], shortfalls: [{ position: 'TE', short: 1 }] },
} satisfies Meta<typeof LineupSummaryPills>
export default meta
type Story = StoryObj<typeof meta>

export const NeedsAttention: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: '2 suggested changes' })).toHaveAttribute('href', '#set-lineup')
    await expect(canvas.getByRole('link', { name: 'Bye crunch: weeks 9, 12' })).toHaveAttribute('href', '#bye-crunch')
    await expect(canvas.getByRole('link', { name: '1 position short' })).toHaveAttribute('href', '#deficits')
  },
}
export const AllClear: Story = {
  args: { suggestedChanges: 0, injuredStarters: 0, byeCrunchWeeks: [], shortfalls: [] },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('No bye crunch ahead')).toBeVisible()
    await expect(canvas.queryAllByRole('link')).toHaveLength(2)
  },
}
export const Loading: Story = {
  args: { suggestedChanges: undefined, injuredStarters: undefined, byeCrunchWeeks: undefined, shortfalls: undefined },
  play: async ({ canvas }) => { await expect(canvas.getByText('… suggested changes')).toBeVisible() },
}
export const Unavailable: Story = {
  args: { suggestedChanges: null, injuredStarters: null, byeCrunchWeeks: null, shortfalls: null },
  play: async ({ canvas }) => { await expect(canvas.getByText('Bye outlook unavailable')).toBeVisible() },
}
export const Phone: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  play: async ({ canvas }) => { await expect(canvas.getByRole('link', { name: '2 suggested changes' })).toBeVisible() },
}
