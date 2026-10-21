import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { mockFetch } from '../../.storybook/mockFetch'
import { DraftConfigContext } from '../hooks/useDraftConfig'
import { TradePage } from './TradePage'
import { stagedProposal, tradeConfig, tradeContext, byeOutlook } from './tradeScore/proposalFixtures'
import { partialScore, proposalEvaluation } from './tradeScore/fixtures'

const meta = {
  title: 'Pages/Trades', component: TradePage,
  parameters: { route: '/trades?week=5', layout: 'fullscreen' },
  decorators: [Story => <DraftConfigContext.Provider value={{ config: tradeConfig, loading: false, saveConfig: fn(), setConfig: fn() }}><Story /></DraftConfigContext.Provider>],
  beforeEach: () => {
    sessionStorage.clear()
    mockFetch([
      { path: /\/v1\/trade\/offers\?status=awaiting_approval/, body: { offers: [stagedProposal(), { ...stagedProposal(), id: 2, offer_key: 'c'.repeat(64), evaluation: proposalEvaluation(partialScore()) }], limit: 100, offset: 0 } },
      { path: /\/v1\/trade\/offers\?status=/, body: { offers: [], limit: 100, offset: 0 } },
      { path: '/v1/trade/score', method: 'POST', body: stagedProposal().evaluation!.score },
      { path: /\/v1\/trade\/offers\/.+\/approve/, method: 'POST', status: 202, body: { offer_key: 'b'.repeat(64), status: 'approved', tracking_id: 'story-queue', approved_by: 'Sample Manager', approved_at: '2026-10-07T12:00:00Z', duplicate: false } },
      { path: '/v1/league/teams', body: { '7': 'Our Team', '8': 'Rival Team' } },
      { path: /\/v1\/trade\/context/, body: tradeContext },
      { path: /\/v1\/roster\/bye-outlook/, body: byeOutlook },
      { path: /\/v1\/league\/current-week/, body: { week: 5 } },
    ])
  },
} satisfies Meta<typeof TradePage>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Phone: Story = { globals: { viewport: { value: 'mobile1', isRotated: false } } }
export const LinkedOffer: Story = { parameters: { route: `/trades?week=5&offer=${'c'.repeat(64)}` } }
