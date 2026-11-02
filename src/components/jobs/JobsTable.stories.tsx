import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'
import { catalogFixture, jobFixture } from './fixtures'
import { JobsTable } from './JobsTable'

const meta = {
  title: 'Jobs/Jobs table',
  component: JobsTable,
  args: { catalog: catalogFixture, selected: null, startingJob: null, onSelect: fn(), onRun: fn() },
} satisfies Meta<typeof JobsTable>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Already running' })).toBeDisabled()
  },
}
export const Selected: Story = { args: { selected: 'set-lineup' } }
export const Starting: Story = {
  args: { startingJob: 'sync-rumors' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Starting…' })).toBeDisabled()
  },
}
/** Unknown values show a dash, and a pause replaces a slot that won't fire. */
export const UnknownAndPaused: Story = {
  args: {
    catalog: {
      chains: [],
      jobs: [
        jobFixture({ name: 'never-scheduled' }),
        jobFixture({
          name: 'paused-job',
          next_run_at: '2026-11-04T00:00:00Z',
          pause: { name: 'paused-job', paused_until: null, reason: 'Bye week', set_at: '2026-11-03T00:00:00Z' },
        }),
      ],
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByText('Manual only')).toHaveLength(2)
    await expect(canvas.getByText('Paused')).toBeVisible()
  },
}
export const Phone: Story = { globals: { viewport: { value: 'mobile1' } } }
