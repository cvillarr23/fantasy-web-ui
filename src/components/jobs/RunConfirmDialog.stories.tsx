import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, within } from 'storybook/test'
import { catalogFixture } from './fixtures'
import { RunConfirmDialog } from './RunConfirmDialog'

const job = (name: string) => catalogFixture.jobs.find((candidate) => candidate.name === name)!

const meta = {
  title: 'Jobs/Run confirm dialog',
  component: RunConfirmDialog,
  args: { opened: true, job: job('set-lineup'), catalog: catalogFixture, downstream: false, params: {}, starting: false, onConfirm: fn(), onCancel: fn() },
} satisfies Meta<typeof RunConfirmDialog>
export default meta
type Story = StoryObj<typeof meta>

export const ActingJob: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await expect(await body.findByRole('button', { name: 'Start run' })).toBeDisabled()
  },
}
export const DryRun: Story = { args: { params: { dry_run: true } } }
export const LaterStepsAct: Story = { args: { job: job('sync-sample'), downstream: true } }
export const DryRunWithDownstream: Story = { args: { downstream: true, params: { dry_run: true } } }
export const Starting: Story = { args: { starting: true } }
