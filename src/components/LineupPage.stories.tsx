import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { mockFetch, type MockRoute } from '../../.storybook/mockFetch'
import { DraftConfigContext } from '../hooks/useDraftConfig'
import { LineupPage } from './LineupPage'
import {
  lineupByeOutlook, lineupConfig, lineupDeficits, lineupNoCrunchOutlook, lineupRoster, lineupTeamNames,
  lineupTradeCandidates, lineupWaivers,
} from './lineupFixtures'

/** Every read the page makes; a story overrides the ones it changes. */
function routes(overrides: MockRoute[] = []): MockRoute[] {
  return [
    ...overrides,
    { path: /\/v1\/matchup\/roster/, body: lineupRoster },
    { path: /\/v1\/roster\/deficits/, body: lineupDeficits },
    { path: /\/v1\/roster\/bye-outlook/, body: lineupByeOutlook },
    { path: /\/v1\/waiver\/recommendations/, body: lineupWaivers },
    { path: /\/v1\/trade\/candidates/, body: { items: lineupTradeCandidates } },
    { path: /\/v1\/league\/current-week/, body: { week: 9 } },
    { path: /\/v1\/league\/teams/, body: lineupTeamNames },
  ]
}

const meta = {
  title: 'Pages/Lineup', component: LineupPage,
  parameters: { route: '/lineup?week=9', layout: 'fullscreen' },
  decorators: [Story => (
    <DraftConfigContext.Provider value={{ config: lineupConfig, loading: false, saveConfig: fn(), setConfig: fn() }}>
      <Story />
    </DraftConfigContext.Provider>
  )],
  beforeEach: () => {
    sessionStorage.clear()
    mockFetch(routes())
  },
} satisfies Meta<typeof LineupPage>
export default meta
type Story = StoryObj<typeof meta>

const submit = (canvas: ReturnType<typeof within>) => canvas.getByRole('button', { name: 'Submit lineup changes' })

/** The action section comes first, header pills summarise it, and an ESPN write needs a confirmation. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Lineup' })).toBeVisible()
    await expect(await canvas.findByRole('link', { name: '1 suggested change' })).toBeVisible()
    await expect(await canvas.findByRole('link', { name: '1 position short' })).toBeVisible()
    await expect(await canvas.findByRole('alert', { name: 'Bye-week crunch ahead' })).toBeVisible()
    await expect(await canvas.findByText('Sample Waiver Back')).toBeVisible()
    await expect(canvas.getByText('Roster deficits', { selector: 'summary' }).closest('details')).not.toHaveAttribute('open')

    await userEvent.click(await canvas.findByRole('button', { name: 'Apply hint' }))
    await expect(canvas.getByText('This changes your real ESPN lineup')).toBeVisible()
    await expect(submit(canvas)).toBeDisabled()
    await userEvent.click(canvas.getByRole('checkbox', { name: /live ESPN lineup/ }))
    await expect(submit(canvas)).toBeEnabled()
  },
}

/** The league deficits sit in a collapsed panel; opening it shows your positions first. */
export const DeficitsOpen: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByText('Roster deficits', { selector: 'summary' }))
    await expect(await canvas.findByText('Your positions')).toBeVisible()
    await expect(canvas.getByText('Short 1')).toBeVisible()
    await expect(canvas.getByRole('columnheader', { name: 'Short at' })).toBeVisible()
  },
}

export const Loading: Story = {
  beforeEach: () => mockFetch(routes([
    { path: /\/v1\/matchup\/roster/, delay: 'never' },
    { path: /\/v1\/roster\/deficits/, delay: 'never' },
    { path: /\/v1\/roster\/bye-outlook/, delay: 'never' },
  ])),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('status', { name: 'Loading your roster' })).toBeVisible()
    await expect(canvas.getByText('… suggested changes')).toBeVisible()
    await expect(canvas.getByText('… bye outlook')).toBeVisible()
  },
}

export const ErrorState: Story = {
  beforeEach: () => mockFetch(routes([
    { path: /\/v1\/matchup\/roster/, status: 500, body: { detail: 'Roster service is down' } },
    { path: /\/v1\/roster\/deficits/, status: 500, body: { detail: 'Deficits service is down' } },
    { path: /\/v1\/roster\/bye-outlook/, status: 500, body: { detail: 'Bye outlook is down' } },
  ])),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Suggested changes unavailable')).toBeVisible()
    await expect(await canvas.findByText('Bye outlook unavailable')).toBeVisible()
    await expect(await canvas.findByText('Roster positions unavailable')).toBeVisible()
    await expect((await canvas.findAllByRole('alert')).length).toBeGreaterThan(0)
  },
}

/** No players and no league rosters yet. */
export const Empty: Story = {
  beforeEach: () => mockFetch(routes([
    { path: /\/v1\/matchup\/roster/, body: { starters: [], bench: [], lineup_slot_counts: { BE: 4 } } },
    { path: /\/v1\/roster\/deficits/, body: { ...lineupDeficits, teams: {} } },
    { path: /\/v1\/roster\/bye-outlook/, body: lineupNoCrunchOutlook },
  ])),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('No suggested changes this week.')).toBeVisible()
    await expect(await canvas.findByText('No bye crunch ahead')).toBeVisible()
    await expect(canvas.queryByRole('alert', { name: 'Bye-week crunch ahead' })).toBeNull()
  },
}

/** A week other than the live one is for planning: staging works, submitting does not. */
export const Stale: Story = {
  parameters: { route: '/lineup?week=8' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/This week is for planning only/)).toBeVisible()
    await userEvent.click(await canvas.findByRole('button', { name: 'Apply hint' }))
    await userEvent.click(canvas.getByRole('checkbox', { name: /live ESPN lineup/ }))
    await expect(submit(canvas)).toBeDisabled()
  },
}

export const Phone: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByRole('link', { name: '1 position short' })).toBeVisible()
    await expect(await canvas.findByText('Sample Waiver Back')).toBeVisible()
    await expect(canvasElement.ownerDocument.documentElement.scrollWidth).toBeLessThanOrEqual(canvasElement.ownerDocument.documentElement.clientWidth)
  },
}
