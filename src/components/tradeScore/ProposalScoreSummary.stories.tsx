import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
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

export const Scored: Story = {
  play: async ({ canvas, canvasElement }) => {
    const tiles = within(canvas.getByLabelText('Score terms summary'))
    await expect(tiles.getByText('+12.6')).toBeVisible()
    await expect(tiles.getByText('Schedule boost')).toBeVisible()
    await expect(tiles.getByText('Cost of helping them')).toBeVisible()
    await userEvent.hover(tiles.getByRole('button', { name: 'What is cost of helping them?' }))
    await waitFor(() => expect(within(canvasElement.ownerDocument.body).getByRole('tooltip')).toBeVisible())
    await expect(within(canvasElement.ownerDocument.body).getByRole('tooltip')).toHaveTextContent("Their lineup gain turned into a penalty on our score. It's weighted heavily in weeks we face them and lightly (×0.25) otherwise. Usually a small negative number.")
    await userEvent.unhover(tiles.getByRole('button', { name: 'What is cost of helping them?' }))
  },
}
export const Phone: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvasElement.ownerDocument.defaultView!.innerWidth).toBeLessThanOrEqual(480)
    const trigger = within(canvas.getByLabelText('Score terms summary')).getByRole('button', { name: 'What is cost of helping them?' })
    const page = within(canvasElement.ownerDocument.body)
    await userEvent.pointer({ keys: '[TouchA]', target: trigger })
    await waitFor(() => expect(page.getByRole('tooltip')).toBeVisible())
    await expect(page.getByRole('tooltip')).toHaveTextContent('penalty on our score')
    await userEvent.pointer({ keys: '[TouchA]', target: trigger })
    await waitFor(() => expect(page.queryByRole('tooltip')).not.toBeInTheDocument())
  },
}
export const Unscored: Story = { args: { offer: offer({ evaluation: proposalEvaluation(unscoredScore()) }) } }

/** `null` means no evidence was stored. */
export const NoEvidence: Story = { args: { offer: offer({ evaluation: null }) } }

/** An absent field means the API didn't say whether evidence exists. */
export const EvidenceUnknown: Story = { args: { offer: offer({ evaluation: undefined }) } }
