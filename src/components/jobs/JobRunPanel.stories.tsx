import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'
import { ApiError } from '../../api/client'
import { catalogFixture, pausedSkipFixture, pauseFixture } from './fixtures'
import { JobRunPanel } from './JobRunPanel'
import './jobs.css'

const job = (name: string) => catalogFixture.jobs.find((candidate) => candidate.name === name)!

const meta = {
  title: 'Jobs/Run panel',
  component: JobRunPanel,
  decorators: [(Story) => <aside className="job-rail"><Story /></aside>],
  args: { job: job('set-lineup'), catalog: catalogFixture, recentRuns: [], starting: false, error: null, started: null, onStart: fn() },
} satisfies Meta<typeof JobRunPanel>
export default meta
type Story = StoryObj<typeof meta>

export const WithParams: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('checkbox', { name: 'Dry run' })).toBeVisible()
  },
}
export const PlainJob: Story = { args: { job: job('sync-rumors') } }
export const ChainStep: Story = { args: { job: job('sync-sample') } }
export const AlreadyRunning: Story = {
  args: { job: job('score-sample') },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Already running' })).toBeDisabled()
    await expect(canvas.getByRole('button', { name: 'Cancel run, score-sample' })).toBeVisible()
  },
}
/** A paused job shows who paused it and why, and its skipped slots say so. */
export const Paused: Story = {
  args: { job: { ...job('sync-rumors'), pause: pauseFixture('sync-rumors', null) }, recentRuns: [pausedSkipFixture] },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Resume' })).toBeVisible()
    await expect(canvas.getByText(/ · paused$/)).toBeVisible()
  },
}
export const Starting: Story = { args: { starting: true } }
export const Queued: Story = { args: { started: { job: 'set-lineup', runId: 'run-9' } } }
export const Refused: Story = {
  args: { job: job('sync-rumors'), error: new ApiError(409, "A run for 'sync-rumors' is already running") },
}
export const Rejected: Story = { args: { error: new ApiError(422, 'week must be an integer') } }
