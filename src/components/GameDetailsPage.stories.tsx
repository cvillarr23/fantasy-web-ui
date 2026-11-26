import type { Meta, StoryObj } from '@storybook/react-vite'
import { Route, Routes } from 'react-router-dom'
import { expect, fn, userEvent, within } from 'storybook/test'
import { mockFetch, type MockRoute } from '../../.storybook/mockFetch'
import { DraftConfigContext } from '../hooks/useDraftConfig'
import { gameFixture, type GameScenario } from './game/fixtures'
import { GameDetailsPage } from './GameDetailsPage'
import { matchupConfig } from './matchup/fixtures'

function mockGame(game: Partial<MockRoute>) {
  mockFetch([
    { path: /^\/v1\/matchup\/games\/evt-1\?/, ...game },
    { path: /\/v1\/league\/current-week/, body: { week: 7 } },
  ])
}

function mockScenario(scenario: GameScenario) {
  mockGame({ body: gameFixture(scenario) })
}

const meta = {
  title: 'Pages/Game details', component: GameDetailsPage,
  parameters: { route: '/matchup/game/evt-1?week=7', layout: 'fullscreen' },
  decorators: [Story => (
    <DraftConfigContext.Provider value={{ config: matchupConfig, loading: false, saveConfig: fn(), setConfig: fn() }}>
      <Routes><Route path="matchup/game/:eventId" element={<Story />} /></Routes>
    </DraftConfigContext.Provider>
  )],
  beforeEach: () => mockScenario('live'),
} satisfies Meta<typeof GameDetailsPage>
export default meta
type Story = StoryObj<typeof meta>

/** A game under way, with one row expanded into its scoring breakdown. */
export const Live: Story = {
  play: async ({ canvas }) => {
    const score = within(await canvas.findByRole('region', { name: 'Score' }))
    await expect(score.getByText('Q3 8:42')).toBeVisible()
    await expect(score.getByText('ATL ball · TB 12')).toBeVisible()
    const totals = within(canvas.getByRole('region', { name: 'Fantasy points from this game' }))
    await expect(totals.getByText('18.6')).toBeVisible()
    await expect(totals.getByText('6.2')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: /Sample Runner A/, expanded: false }))
    await expect(canvas.getByRole('table', { name: "This week's scoring breakdown" })).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'See all rules' })).toBeVisible()
  },
}
export const Final: Story = {
  beforeEach: () => mockScenario('final'),
  play: async ({ canvas }) => {
    const score = within(await canvas.findByRole('region', { name: 'Score' }))
    await expect(score.getByText('Final')).toBeVisible()
    await expect(score.getByText('31')).toBeVisible()
    await expect(canvas.getByText('3-yd TD run')).toBeVisible()
  },
}
export const PreGame: Story = {
  beforeEach: () => mockScenario('preGame'),
  play: async ({ canvas }) => {
    const score = within(await canvas.findByRole('region', { name: 'Score' }))
    await expect(score.getByText('Upcoming')).toBeVisible()
    await expect(canvas.getByText("No plays yet. The game hasn't kicked off.")).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: /Sample Runner A/, expanded: false }))
    await expect(canvas.getByText("No stats yet. This game hasn't started.")).toBeVisible()
  },
}
export const Loading: Story = {
  beforeEach: () => mockGame({ delay: 'never' }),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('status', { name: 'Loading game' })).toBeVisible()
  },
}
/** Core has no snapshot of the game for this week. */
export const NoLiveData: Story = {
  beforeEach: () => mockGame({ status: 404, body: { detail: 'No live snapshot of game evt-1.' } }),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('No live data for this game this week.')).toBeVisible()
  },
}
export const Error: Story = {
  beforeEach: () => mockGame({ status: 503, body: { detail: 'The live snapshot is unavailable' } }),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('alert')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Retry' })).toBeVisible()
  },
}
export const LivePhone: Story = {
  ...Live,
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
}
