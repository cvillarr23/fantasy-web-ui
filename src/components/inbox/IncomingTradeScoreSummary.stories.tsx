import type { Meta, StoryObj } from '@storybook/react-vite'
import type { IncomingTrade } from '../../api/tradeInboxTypes'
import { IncomingTradeScoreSummary } from './IncomingTradeScoreSummary'
import { offer } from './inboxFixtures'

const withScore = (score: Partial<NonNullable<IncomingTrade['score']>> | null): IncomingTrade => ({
  ...offer,
  score: score === null ? null : ({ ...offer.score, ...score } as IncomingTrade['score']),
})

/** The score line on an incoming offer in the inbox. */
const meta = {
  title: 'Inbox/IncomingTradeScoreSummary',
  component: IncomingTradeScoreSummary,
  args: { row: offer },
} satisfies Meta<typeof IncomingTradeScoreSummary>

export default meta
type Story = StoryObj<typeof meta>

export const Scored: Story = {}
export const ExceedsRosterLimit: Story = { args: { row: withScore({ exceeds_roster_limit: true }) } }
export const PartialHorizon: Story = { args: { row: withScore({ complete_horizon: false, partial_reasons: ['nfl_schedule_unavailable'] }) } }
export const NotScored: Story = { args: { row: withScore(null) } }
