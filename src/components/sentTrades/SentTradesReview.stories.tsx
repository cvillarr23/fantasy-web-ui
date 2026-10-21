import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { SentTradesReview } from './SentTradesReview'
import { sentConfig, sentFixture, sentFixtures, sentNames, answeredFixture } from './fixtures'
import { completeScore } from '../tradeScore/fixtures'
import { mockFetch } from '../../../.storybook/mockFetch'

const meta = {
  title: 'Trades/Sent trades', component: SentTradesReview,
  args: { trades: sentFixtures(), names: sentNames, config: sentConfig, week: 6 },
  parameters: { layout: 'fullscreen', docs: { description: { component: 'After-approval review. Answered outcomes are illustrative fixtures pending the outgoing outcome API; live offers remain Waiting until answers are recorded.' } } },
  decorators: [(Story) => <div style={{ padding: 24 }}><Story /></div>],
  beforeEach: () => {
    const score = completeScore()
    score.as_of_week = 6
    score.score.final_score = 15.2
    score.score.counterparty_weighted_benefit = -0.2
    mockFetch([{ path: '/v1/trade/score', method: 'POST', body: score }])
  },
} satisfies Meta<typeof SentTradesReview>
export default meta
type Story = StoryObj<typeof meta>
export const Waiting: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('heading', { name: 'Sent trades' })).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Show the generated draft' }))
    await expect(canvas.getByText('You are thin at WR and deep at RB. This improves both starting lineups.')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Hide the generated draft' }))
    await userEvent.click(canvas.getByRole('button', { name: 'Accepted 1' }))
    await expect(canvas.getByRole('article')).toHaveTextContent('Waiver Wire Warriors')
  },
}
export const Countered: Story = { args: { trades: [answeredFixture('countered', 2)] } }
export const Accepted: Story = { args: { trades: [answeredFixture('accepted', 3)] } }
export const Declined: Story = { args: { trades: [answeredFixture('declined', 4)] } }
export const NotSent: Story = { args: { trades: [sentFixture({ status: 'submit_blocked' })] } }
export const Queued: Story = { args: { trades: [sentFixture({ status: 'approved' })] } }
export const PublicationUnconfirmed: Story = { args: { trades: [sentFixture({ status: 'approval_pending' })] } }
export const Submitting: Story = { args: { trades: [sentFixture({ status: 'submitting' })] } }
export const WorkerFailure: Story = { args: { trades: [sentFixture({ status: 'failure' })] } }
export const DryRun: Story = { args: { trades: [sentFixture({ status: 'dry_run_filled' })] } }
export const Empty: Story = { args: { trades: [] } }
export const MissingEvidence: Story = { args: { trades: [sentFixture({ evaluation: null, drafted_message: null, edited_by: null })], week: null } }
export const Phone: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
}
