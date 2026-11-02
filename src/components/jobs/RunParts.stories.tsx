import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { ChildRunList } from './ChildRunList'
import { runDetailFixture } from './fixtures'
import { GrafanaLogs } from './GrafanaLogs'
import './jobs.css'
import { RunTimeline } from './RunTimeline'

const meta = { title: 'Jobs/Run detail parts' } satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const TimelineFailed: Story = { render: () => <RunTimeline run={runDetailFixture} /> }
export const TimelineQueued: Story = {
  render: () => <RunTimeline run={{ ...runDetailFixture, status: 'queued', finished_at: null, end_reason: null, scheduled_for: null }} />,
}
export const TimelineSkipped: Story = {
  render: () => <RunTimeline run={{ ...runDetailFixture, status: 'skipped', end_reason: 'dependency_failed' }} />,
}
export const ChildRuns: Story = {
  render: () => <ChildRunList runs={runDetailFixture.children} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'Open LLM session: Sample claim reasoning' })).toBeVisible()
  },
}
export const ChildRunsPhone: Story = {
  globals: { viewport: { value: 'mobile1' } },
  render: () => <ChildRunList runs={runDetailFixture.children} />,
}
export const Grafana: Story = {
  render: () => <GrafanaLogs baseUrl="https://grafana.example" run={runDetailFixture} />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Show Grafana logs here' }))
    await expect(canvas.getByRole('button', { name: 'Hide Grafana logs' })).toBeVisible()
  },
}
