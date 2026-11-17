import type { Meta, StoryObj } from '@storybook/react-vite'
import { resourceSuggestionsFixture, runDetailFixture, runResourcesFixture } from './fixtures'
import './jobs.css'
import { ResourceSuggestions } from './ResourceSuggestions'
import { RunUsage } from './RunUsage'

const meta = { title: 'Jobs/Resource usage' } satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const finished = { ...runDetailFixture, status: 'success' as const, executor: 'pod' }

export const Suggestions: Story = {
  render: () => (
    <section className="jobs-main job-panel">
      <h2>Resource sizing</h2>
      <ResourceSuggestions report={resourceSuggestionsFixture} />
    </section>
  ),
}
export const SuggestionsPhone: Story = { ...Suggestions, globals: { viewport: { value: 'mobile1' } } }
export const RunUsageAgainstLimits: Story = {
  render: () => <RunUsage run={{ ...finished, summary: { resources: runResourcesFixture } }} />,
}
export const RunUsageMissing: Story = { render: () => <RunUsage run={{ ...finished, summary: {} }} /> }
