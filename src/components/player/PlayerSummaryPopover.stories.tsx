import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, screen } from 'storybook/test'
import { mockFetch } from '../../../.storybook/mockFetch'
import { playerSummary } from '../../stories/fixtures'
import { PlayerSummaryPopover } from './PlayerSummaryPopover'

const path = '/v1/players/p9002/summary'

/** Fetches `/v1/players/{id}/summary` when opened. It renders in a Mantine modal, so the
 * stories query the whole document rather than the story canvas. */
const meta = {
  title: 'Player/PlayerSummaryPopover',
  component: PlayerSummaryPopover,
  args: { playerId: 'p9002', onClose: fn() },
} satisfies Meta<typeof PlayerSummaryPopover>

export default meta
type Story = StoryObj<typeof meta>

export const Loaded: Story = {
  beforeEach: () => mockFetch([{ path, body: playerSummary }]),
  play: async () => {
    await expect(await screen.findByText('Limited in Wednesday practice with an ankle issue.')).toBeVisible()
  },
}

export const NoNews: Story = {
  beforeEach: () => mockFetch([{ path, body: { ...playerSummary, recent_news: [] } }]),
  play: async () => {
    await expect(await screen.findByText('No recent news.')).toBeVisible()
  },
}

export const Loading: Story = {
  beforeEach: () => mockFetch([{ path, delay: 'never' }]),
  play: async () => {
    await expect(await screen.findByRole('status', { name: 'Loading player' })).toHaveAttribute('aria-busy', 'true')
  },
}

export const Error: Story = {
  beforeEach: () => mockFetch([{ path, status: 404, body: { detail: 'Player not found' } }]),
  play: async () => {
    await expect(await screen.findByText(/Failed to load player summary/)).toBeVisible()
  },
}
