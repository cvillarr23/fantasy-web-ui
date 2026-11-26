import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { mockFetch, type MockRoute } from '../../.storybook/mockFetch'
import { queryClient } from '../api/queryClient'
import { matchupQuery } from '../api/weekReads'
import { DraftConfigContext } from '../hooks/useDraftConfig'
import { MatchupPage } from './MatchupPage'
import { matchupConfig, matchupFixture } from './matchup/fixtures'
import { liveFeedFixture, liveMatchupFixture, type LiveScenario } from './matchup/liveFixtures'

function mockMatchup(matchup: Partial<MockRoute>, feed: Partial<MockRoute> = { body: { items: [], next_before: null } }) {
  mockFetch([
    { path: /^\/v1\/matchup\?/, ...matchup },
    { path: /^\/v1\/matchup\/feed\?/, ...feed },
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

function mockLive(scenario: LiveScenario) {
  mockMatchup({ body: liveMatchupFixture(scenario) }, { body: liveFeedFixture(scenario) })
}

/** A Sunday with one game under way, one final, one not started, and a starter on a bye. */
export const LiveSunday: Story = {
  beforeEach: () => mockLive('sunday'),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('2 playing · 1 yet to play · 1 on bye')).toBeVisible()
    await expect(canvas.getByText("ESPN's live win probability")).toBeVisible()
    const games = within(canvas.getByRole('region', { name: 'Games in this matchup' }))
    await expect(games.getByText('TB 14 – 17 ATL')).toBeVisible()
    await expect(games.getByText('Q3 8:42')).toBeVisible()
    await expect(canvas.getAllByRole('listitem').length).toBeGreaterThan(6)
    await userEvent.click(canvas.getByRole('button', { name: 'Touchdowns' }))
    await expect(canvas.getByText('24-yd TD reception')).toBeVisible()
    await expect(canvas.queryByText('12-yd run to TB 12')).toBeNull()
  },
}
/** Nothing has kicked off: no polling, an empty feed and upcoming tiles without points. */
export const PreGameWeek: Story = {
  beforeEach: () => mockLive('preGame'),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('0 playing · 5 yet to play · 1 on bye')).toBeVisible()
    await expect(canvas.getByText('No plays or news yet.')).toBeVisible()
    const games = within(canvas.getByRole('region', { name: 'Games in this matchup' }))
    await expect(games.getByText('GB @ DET')).toBeVisible()
    await expect(games.queryByText(/^You .* pts$/)).toBeNull()
  },
}
export const FinalWeek: Story = {
  beforeEach: () => mockLive('final'),
  play: async ({ canvas }) => {
    const games = within(await canvas.findByRole('region', { name: 'Games in this matchup' }))
    await expect(games.getByText('MIA 20 – 31 BUF')).toBeVisible()
    await expect(games.getByText('Final')).toBeVisible()
    await expect(games.getByText(/^You .* pts$/)).toBeVisible()
  },
}
/** Core sends a game id with each snapshot, so the tiles link to Game details. */
export const LinkedGameTiles: Story = {
  beforeEach: () => {
    const matchup = liveMatchupFixture('sunday')
    for (const line of [...matchup.our_team.starters, ...matchup.opponent.starters]) {
      if (line.live) line.live.event_id = `${line.live.away_abbr}-${line.live.home_abbr}`
    }
    mockMatchup({ body: matchup }, { body: liveFeedFixture('sunday') })
  },
  play: async ({ canvas }) => {
    const games = within(await canvas.findByRole('region', { name: 'Games in this matchup' }))
    await expect(games.getByRole('link', { name: /TB 14 – 17 ATL/ })).toHaveAttribute('href', '/matchup/game/TB-ATL?week=7')
  },
}
export const LiveSundayPhone: Story = {
  ...LiveSunday,
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
}
