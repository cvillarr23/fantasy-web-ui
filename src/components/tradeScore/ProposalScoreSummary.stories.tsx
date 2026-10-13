import type { Meta, StoryObj } from '@storybook/react-vite'
import type { TradeOffer } from '../../api/types'
import { ProposalScoreSummary } from './ProposalScoreSummary'
import { proposalEvaluation, unscoredScore } from './fixtures'

const offer = (over: Partial<TradeOffer> = {}): TradeOffer => ({
  id: 1,
  status: 'proposed',
  league_id: '123',
  season: 2026,
  executed_at: '2026-10-07T09:00:00Z',
  from_team_id: '7',
  to_team_id: '8',
  incoming_player_ids: ['p200'],
  outgoing_player_ids: ['p100'],
  incoming_players: [{ espn_id: '200', name: 'Received Wideout' }],
  outgoing_players: [{ espn_id: '100', name: 'Sent Back' }],
  evaluation: proposalEvaluation(),
  ...over,
})

/** The stored score evidence on an outgoing proposal. */
const meta = {
  title: 'Trade score/ProposalScoreSummary',
  component: ProposalScoreSummary,
  args: { offer: offer(), teamNames: { '7': 'Our Team', '8': 'Rival Team' } },
} satisfies Meta<typeof ProposalScoreSummary>

export default meta
type Story = StoryObj<typeof meta>

export const Scored: Story = {}
export const Unscored: Story = { args: { offer: offer({ evaluation: proposalEvaluation(unscoredScore()) }) } }

/** `null` means no evidence was stored. */
export const NoEvidence: Story = { args: { offer: offer({ evaluation: null }) } }

/** An absent field means the API didn't say whether evidence exists. */
export const EvidenceUnknown: Story = { args: { offer: offer({ evaluation: undefined }) } }
