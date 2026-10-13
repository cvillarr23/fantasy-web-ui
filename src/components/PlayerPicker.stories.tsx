import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { mockFetch } from '../../.storybook/mockFetch'
import { searchResults } from '../stories/fixtures'
import { PlayerPicker } from './PlayerPicker'

/** Searches `/v1/players/search` after two characters, debounced. */
const meta = {
  title: 'Inputs/PlayerPicker',
  component: PlayerPicker,
  args: { selected: null, onSelect: fn(), onClear: fn() },
  beforeEach: () =>
    mockFetch([
      { path: /^\/v1\/players\/search\?.*q=sam/i, body: searchResults },
      { path: /^\/v1\/players\/search/, body: [] },
    ]),
} satisfies Meta<typeof PlayerPicker>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}

export const Results: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByPlaceholderText('Search player by name…'), 'sam')
    await expect(await canvas.findByText('Sample Runner')).toBeVisible()
  },
}

export const NoMatches: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByPlaceholderText('Search player by name…'), 'zz')
    await expect(await canvas.findByText('No matches.')).toBeVisible()
  },
}

/** Unknown VORP and projection are left out rather than shown as zero. */
export const Selected: Story = { args: { selected: searchResults[2] } }

export const SelectedWithStats: Story = { args: { selected: searchResults[1] } }
