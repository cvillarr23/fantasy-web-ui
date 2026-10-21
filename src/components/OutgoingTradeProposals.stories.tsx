import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { mockFetch } from '../../.storybook/mockFetch'
import type { TradeOffer } from '../api/types'
import { OutgoingTradeProposals } from './OutgoingTradeProposals'
import { partialScore, proposalEvaluation } from './tradeScore/fixtures'
import { stagedProposal, tradeConfig, tradeContext } from './tradeScore/proposalFixtures'

export function mockProposals(offers: TradeOffer[]) {
  sessionStorage.clear()
  mockFetch([
    { path: /\/v1\/trade\/offers\?status=awaiting_approval/, body: { offers, limit: 100, offset: 0 } },
    { path: /\/v1\/trade\/offers\?status=/, body: { offers: [], limit: 100, offset: 0 } },
    { path: '/v1/league/teams', body: { '7': 'Our Team', '8': 'Rival Team' } },
    { path: '/v1/trade/score', method: 'POST', body: stagedProposal().evaluation!.score },
    { path: /\/v1\/trade\/offers\/.+\/approve/, method: 'POST', status: 202, body: { offer_key: 'b'.repeat(64), status: 'approved', tracking_id: 'story-queue', approved_by: 'Sample Manager', approved_at: '2026-10-07T12:00:00Z', duplicate: false } },
  ])
}
const meta = {
  title: 'Trades/Outgoing proposals', component: OutgoingTradeProposals,
  args: { config: tradeConfig, week: 5, players: Object.values(tradeContext.teams).flatMap(team => team.roster) },
  beforeEach: () => mockProposals([stagedProposal()]),
} satisfies Meta<typeof OutgoingTradeProposals>
export default meta
type Story = StoryObj<typeof meta>
export const Scored: Story = {}
export const PartialHorizon: Story = { beforeEach: () => mockProposals([{ ...stagedProposal(), evaluation: proposalEvaluation(partialScore()) }]) }
export const NoEvaluation: Story = { beforeEach: () => mockProposals([{ ...stagedProposal(), evaluation: null }]) }
export const EvaluationAbsent: Story = { beforeEach: () => { const offer = stagedProposal(); delete offer.evaluation; mockProposals([offer]) } }
export const LinkedOffer: Story = { args: { linkedOfferKey: 'a'.repeat(64) } }
export const Phone: Story = { globals: { viewport: { value: 'mobile1', isRotated: false } }, parameters: { viewport: { defaultViewport: 'mobile1' } } }
export const Edited: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Read generated message' }))
    await userEvent.click(canvas.getByRole('button', { name: 'Edit message' }))
    await userEvent.clear(canvas.getByRole('textbox', { name: 'Message to Rival Team' }))
    await userEvent.type(canvas.getByRole('textbox', { name: 'Message to Rival Team' }), "Let's swap these players. Open to discussing a different package.")
    await userEvent.click(canvas.getByRole('button', { name: 'Save message' }))
    await expect(canvas.getByText('Edited by you')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Reset to generated draft' })).toBeVisible()
  },
}
export const PersistedEdit: Story = {
  beforeEach: () => mockProposals([{ ...stagedProposal(), message: 'Previously approved edited terms.', message_edited: true, edited_by: 'Sample Manager' }]),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Read your edited message' }))
    await expect(canvas.queryByRole('button', { name: 'Reset to generated draft' })).toBeNull()
  },
}
export const Review: Story = {
  play: async ({ canvas }) => {
    const button = await canvas.findByRole('button', { name: 'Review approval' })
    await expect(button).toBeEnabled()
    await userEvent.click(button)
  },
}
