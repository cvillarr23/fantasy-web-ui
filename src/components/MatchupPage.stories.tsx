import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { mockFetch, type MockRoute } from '../../.storybook/mockFetch'
import { queryClient } from '../api/queryClient'
import { matchupQuery } from '../api/weekReads'
import { DraftConfigContext } from '../hooks/useDraftConfig'
import { MatchupPage } from './MatchupPage'
import { matchupConfig, matchupFixture } from './matchup/fixtures'

function mockMatchup(matchup: Partial<MockRoute>) {
  mockFetch([
    { path: /^\/v1\/matchup\?/, ...matchup },
    { path: /\/v1\/league\/current-week/, body: { week: 7 } },
  ])
}

const meta = {
  title: 'Pages/Matchup', component: MatchupPage,
  parameters: { route: '/matchup?week=7', layout: 'fullscreen' },
  decorators: [Story => <DraftConfigContext.Provider value={{ config: matchupConfig, loading: false, saveConfig: fn(), setConfig: fn() }}><Story /></DraftConfigContext.Provider>],
  beforeEach: () => mockMatchup({ body: matchupFixture() }),
} satisfies Meta<typeof MatchupPage>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Matchup' })).toBeVisible()
    await expect(await canvas.findByRole('link', { name: 'Projected margin +8.6' })).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Win chance ~63% (estimate)' })).toBeVisible()
    await expect(canvas.getByRole('link', { name: '1 starter projected 0.0' })).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Edit lineup for this week' })).toBeVisible()
    const bench = canvas.getAllByText('Bench (4)')[0]
    await userEvent.click(bench)
    await expect(bench.closest('details')).toHaveAttribute('open')
  },
}
export const Loading: Story = {
  beforeEach: () => mockMatchup({ delay: 'never' }),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('status', { name: 'Loading matchup' })).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Projected margin …' })).toBeVisible()
  },
}
export const Error: Story = {
  beforeEach: () => mockMatchup({ status: 500, body: { detail: 'ESPN request timed out' } }),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('alert')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Retry' })).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Projected margin unavailable' })).toBeVisible()
  },
}
export const Empty: Story = {
  beforeEach: () => mockMatchup({ status: 404, body: { detail: 'No matchup' } }),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/No matchup found for this week/)).toBeVisible()
    await expect(canvas.queryByRole('status', { name: 'Loading matchup' })).toBeNull()
  },
}
/** The cached matchup is old, the refresh fails, and the last data stays on screen under an error. */
export const Stale: Story = {
  beforeEach: () => {
    queryClient.setQueryData(matchupQuery(matchupConfig, 7).queryKey, matchupFixture(), { updatedAt: Date.now() - 10 * 60_000 })
    mockMatchup({ status: 502, body: { detail: 'Could not reach ESPN' } })
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/Could not refresh this matchup/)).toBeVisible()
    await expect(canvas.getAllByText('Gridiron Gang').length).toBeGreaterThan(0)
    await expect(canvas.getByRole('button', { name: 'Retry' })).toBeVisible()
  },
}
export const Phone: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('img', { name: 'Projected 0.0' })).toBeVisible()
    await expect(canvas.getByText('FLEX · WR')).toBeVisible()
    await expect(canvas.queryByText('RB · RB')).toBeNull()
  },
}
