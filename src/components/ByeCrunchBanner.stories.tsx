import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { ByeCrunchSummary } from './ByeCrunchBanner'
import { byeFillIns, byeTradeFixes } from './byeFixes'
import { lineupByeOutlook, lineupTradeCandidates, lineupWaivers } from './lineupFixtures'

const meta = {
  title: 'Lineup/ByeCrunchSummary', component: ByeCrunchSummary,
  args: {
    outlook: lineupByeOutlook,
    fixes: { waivers: byeFillIns(lineupWaivers.recommendations, [9]), trades: byeTradeFixes(lineupTradeCandidates, [9]) },
  },
} satisfies Meta<typeof ByeCrunchSummary>
export default meta
type Story = StoryObj<typeof meta>

export const WithFixes: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Sample Waiver Back')).toBeVisible()
    await expect(canvas.getByText('+4.8 VORP')).toBeVisible()
    await expect(canvas.getByText('✓ Proposable')).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'See all trades' })).toBeVisible()
  },
}
export const Loading: Story = {
  args: { fixes: { waivers: undefined, trades: undefined } },
  play: async ({ canvas }) => { await expect(canvas.getByText('Loading fill-ins…')).toBeVisible() },
}
export const NothingFound: Story = {
  args: { fixes: { waivers: [], trades: [] } },
  play: async ({ canvas }) => { await expect(canvas.getByText('No proposable trades fix these weeks.')).toBeVisible() },
}
export const OnePanelFailed: Story = {
  args: { fixes: { waivers: null, trades: byeTradeFixes(lineupTradeCandidates, [9]) } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText('Waiver fill-ins')).toBeNull()
    await expect(canvas.getByText('Trade targets')).toBeVisible()
  },
}
export const LinksOnly: Story = {
  args: { fixes: undefined },
  play: async ({ canvas }) => { await expect(canvas.getByRole('link', { name: 'See all fill-ins' })).toBeVisible() },
}
export const Phone: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  play: async ({ canvas }) => { await expect(canvas.getByText('Sample Waiver Back')).toBeVisible() },
}
