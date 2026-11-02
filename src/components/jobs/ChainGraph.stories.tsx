import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'
import type { RunDetail } from '../../api/runs'
import { ChainPanel } from './ChainPanel'
import { catalogFixture, chainFixture, chainRootFixture, pauseFixture } from './fixtures'

const meta = {
  title: 'Jobs/Chain panel',
  component: ChainPanel,
  args: { chain: chainFixture, jobs: catalogFixture.jobs, root: chainRootFixture, selected: null, onSelect: fn() },
} satisfies Meta<typeof ChainPanel>
export default meta
type Story = StoryObj<typeof meta>

const finishedRoot: RunDetail = {
  ...chainRootFixture,
  status: 'failure',
  finished_at: '2026-11-04T02:00:00Z',
  children: [
    { ...chainRootFixture.children[0] },
    { ...chainRootFixture.children[1], status: 'failure', finished_at: '2026-11-03T22:10:00Z' },
    { ...chainRootFixture.children[1], id: 'r3', job_name: 'refresh-sample', status: 'success', finished_at: '2026-11-03T22:20:00Z' },
    { ...chainRootFixture.children[1], id: 'r4', job_name: 'set-lineup', status: 'skipped', finished_at: '2026-11-03T22:21:00Z' },
    { ...chainRootFixture.children[1], id: 'r5', job_name: 'claim-waivers', status: 'cancelled', finished_at: '2026-11-03T22:22:00Z' },
  ],
}

export const Running: Story = {
  play: async ({ canvas, args }) => {
    await expect(canvas.getByText('Running · step 2 of 5')).toBeVisible()
    canvas.getByRole('button', { name: /^set-lineup/ }).click()
    await expect(args.onSelect).toHaveBeenCalledWith('set-lineup')
  },
}
export const Finished: Story = { args: { root: finishedRoot } }
export const NeverRun: Story = {
  args: { root: null },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByText('No run yet').length).toBeGreaterThan(1)
  },
}
/** A manual run from the third step leaves earlier steps out. */
export const StartedPartWay: Story = {
  args: { root: { ...chainRootFixture, trigger: { from_step: 'refresh-sample' }, children: [] } },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByText('Not in this run')).toHaveLength(2)
  },
}
export const Selected: Story = { args: { selected: 'set-lineup' } }
/** A paused chain shows its pause in place of Pause chain…, and a paused step says so. */
export const Paused: Story = {
  args: {
    chain: { ...chainFixture, pause: pauseFixture('sample-weekly', null) },
    jobs: catalogFixture.jobs.map((job) => (job.name === 'set-lineup' ? { ...job, pause: pauseFixture('set-lineup', null) } : job)),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Resume chain' })).toBeVisible()
    await expect(canvas.getByRole('button', { name: /^set-lineup, .*paused/ })).toBeVisible()
  },
}
export const Phone: Story = {
  globals: { viewport: { value: 'mobile1' } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('list')).toBeVisible()
  },
}
const LONG_STEP = 'score-sample-projections-weekly'
/** The fixtures with the running step renamed, through the chain, catalog and run alike. */
const renamed = <T,>(value: T): T => JSON.parse(JSON.stringify(value).replaceAll('"score-sample"', `"${LONG_STEP}"`))
/** A running step with a long name and both badges keeps its note clear of Cancel. */
export const LongRunningStep: Story = {
  args: {
    chain: renamed(chainFixture),
    root: renamed(chainRootFixture),
    jobs: renamed(catalogFixture.jobs).map((job) => (job.name === LONG_STEP ? { ...job, acts: true, pause: pauseFixture(LONG_STEP, null) } : job)),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: `Cancel, ${LONG_STEP}` })).toBeVisible()
  },
}
