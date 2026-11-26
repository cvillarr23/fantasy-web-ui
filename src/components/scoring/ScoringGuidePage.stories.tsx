import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { mockFetch, type MockRoute } from '../../../.storybook/mockFetch'
import { DraftConfigContext } from '../../hooks/useDraftConfig'
import { matchupConfig, matchupFixture } from '../matchup/fixtures'
import { scoredMatchupFixture, scoringRules } from './fixtures'
import { ScoringGuidePage } from './ScoringGuidePage'

function mockGuide(matchup: Partial<MockRoute>, rules: Partial<MockRoute> = { body: scoringRules }) {
  mockFetch([
    { path: /^\/v1\/scoring\/rules/, ...rules },
    { path: /^\/v1\/matchup\?/, ...matchup },
    { path: /\/v1\/league\/current-week/, body: { week: 7 } },
  ])
}

const meta = {
  title: 'Pages/Scoring guide', component: ScoringGuidePage,
  parameters: { route: '/scoring?week=7', layout: 'fullscreen' },
  decorators: [Story => <DraftConfigContext.Provider value={{ config: matchupConfig, loading: false, saveConfig: fn(), setConfig: fn() }}><Story /></DraftConfigContext.Provider>],
  beforeEach: () => mockGuide({ body: scoredMatchupFixture() }),
} satisfies Meta<typeof ScoringGuidePage>
export default meta
type Story = StoryObj<typeof meta>

/** The example starts on your highest scorer and follows the picker. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('table', { name: "Your league's scoring rules" })).toBeVisible()
    await expect(await canvas.findByText('Rushing yards: 78 yds × 0.1 = 7.8')).toBeVisible()
    const picker = canvas.getByRole('combobox', { name: 'Player' })
    await userEvent.selectOptions(picker, 'c1')
    await expect(canvas.getByText('Passing yards: 300 yds × 0.04 = 12')).toBeVisible()
    const example = canvas.getByRole('table', { name: "This week's scoring breakdown" })
    await expect(within(example).getByText('300 yds')).toBeVisible()
  },
}
export const NobodyScoredYet: Story = {
  beforeEach: () => mockGuide({ body: matchupFixture() }),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/No player in this matchup has scored yet/)).toBeVisible()
    await expect(canvas.getByRole('list', { name: 'How a score adds up' })).toBeVisible()
  },
}
export const Loading: Story = {
  beforeEach: () => mockGuide({ delay: 'never' }, { delay: 'never' }),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('status', { name: 'Loading scoring rules' })).toBeVisible()
    await expect(await canvas.findByRole('status', { name: 'Loading example' })).toBeVisible()
  },
}
export const RulesError: Story = {
  beforeEach: () => mockGuide({ body: scoredMatchupFixture() }, { status: 500, body: { detail: 'Database unavailable' } }),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('alert')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Retry' })).toBeVisible()
  },
}
export const RulesNotSynced: Story = {
  beforeEach: () => mockGuide({ body: scoredMatchupFixture() }, { status: 404, body: { detail: 'No league settings synced' } }),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('No scoring settings synced for the 2026 season.')).toBeVisible()
  },
}
export const Phone: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('table', { name: "This week's scoring breakdown" })).toBeVisible()
  },
}
