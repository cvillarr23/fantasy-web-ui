import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, screen, userEvent } from 'storybook/test'
import { mockFetch } from '../../../.storybook/mockFetch'
import { playerNews, playerSummary, playerSummaryLive } from '../../stories/fixtures'
import { PlayerSummaryPopover } from './PlayerSummaryPopover'

const path = '/v1/players/p9002/summary'
const newsPath = /^\/v1\/news\?player_ids=p9002/

/** Fetches `/v1/players/{id}/summary` when opened. It renders in a Mantine modal, so the
 * stories query the whole document rather than the story canvas. */
const meta = {
  title: 'Player/PlayerSummaryPopover',
  component: PlayerSummaryPopover,
  args: { playerId: 'p9002', onClose: fn() },
} satisfies Meta<typeof PlayerSummaryPopover>

export default meta
type Story = StoryObj<typeof meta>

export const Summary: Story = {
  beforeEach: () => mockFetch([{ path, body: playerSummary }]),
  play: async () => {
    await expect(await screen.findByText('QUESTIONABLE')).toBeVisible()
    await expect(screen.queryByText('This week')).toBeNull()
  },
}

export const SummaryWithLiveData: Story = {
  args: { onOpenGame: fn(), onOpenScoringGuide: fn() },
  beforeEach: () => mockFetch([{ path, body: playerSummaryLive }]),
  play: async () => {
    await expect(await screen.findByText('SF 20 – 14 SEA')).toBeVisible()
    await expect(screen.getByRole('button', { name: 'Open game details →' })).toBeVisible()
  },
}

export const News: Story = {
  beforeEach: () => mockFetch([{ path, body: playerSummary }, { path: newsPath, body: { items: playerNews } }]),
  play: async () => {
    await userEvent.click(await screen.findByRole('tab', { name: 'News' }))
    await expect(await screen.findByText(/Also reported by RotoWire, r\/fantasyfootball/)).toBeVisible()
  },
}

export const NewsEmpty: Story = {
  beforeEach: () => mockFetch([{ path, body: playerSummary }, { path: newsPath, body: { items: [] } }]),
  play: async () => {
    await userEvent.click(await screen.findByRole('tab', { name: 'News' }))
    await expect(await screen.findByText('No news in the last 7 days.')).toBeVisible()
  },
}

export const NewsLoading: Story = {
  beforeEach: () => mockFetch([{ path, body: playerSummary }, { path: newsPath, delay: 'never' }]),
  play: async () => {
    await userEvent.click(await screen.findByRole('tab', { name: 'News' }))
    await expect(await screen.findByRole('status', { name: 'Loading news' })).toHaveAttribute('aria-busy', 'true')
  },
}

export const Stats: Story = {
  args: { onOpenScoringGuide: fn() },
  beforeEach: () => mockFetch([{ path, body: playerSummaryLive }]),
  play: async () => {
    await userEvent.click(await screen.findByRole('tab', { name: 'Stats' }))
    await expect(await screen.findByRole('table', { name: "This week's scoring breakdown" })).toBeVisible()
    await expect(screen.getByRole('button', { name: 'How is this scored?' })).toBeVisible()
  },
}

export const StatsWithoutData: Story = {
  beforeEach: () => mockFetch([{ path, body: playerSummary }]),
  play: async () => {
    await userEvent.click(await screen.findByRole('tab', { name: 'Stats' }))
    await expect(await screen.findByText('No stats yet for this player.')).toBeVisible()
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
