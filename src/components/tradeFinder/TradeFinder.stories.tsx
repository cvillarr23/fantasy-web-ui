import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { mockFetch } from '../../../.storybook/mockFetch'
import { useTradeContextControls } from '../../hooks/useTradeContextControls'
import { TradeFinder } from './TradeFinder'
import { candidates, candidate, finderConfig, finderContext, finderDeficits } from './fixtures'
import { completeScore } from '../tradeScore/fixtures'

function routes(overrides: Parameters<typeof candidates>[0] = {}) {
  const score = completeScore()
  score.roster_impact.counterparty.weeks.forEach((w) => { w.delta = 1.1; w.after = w.before + 1.1 })
  score.roster_impact.counterparty.total_delta = 4.4
  score.score.counterparty_lineup_change = 4.4
  score.score.counterparty_weighted_benefit = -4.4
  score.score.final_score = 9.4
  return [
    { path: '/v1/trade/candidates', body: candidates({ items: [candidate(), candidate({ candidate_key: 'second', counterparty: { team_id: '9', name: 'Sunday Crew' }, our_lineup_gain: 5.1, final_score: 4.9 })], total: 2, ...overrides }) },
    { path: '/v1/trade/context', body: finderContext }, { path: '/v1/roster/deficits', body: finderDeficits },
    { path: '/v1/trade/score', method: 'POST', body: score },
  ]
}
const meta = {
  title: 'Trade finder/TradeFinder', component: TradeFinder,
  args: { config: finderConfig, week: 5 },
  beforeEach: () => mockFetch(routes()),
  render: function FinderStory(args) {
    const controls = useTradeContextControls(args.config)
    return <TradeFinder {...args} controls={controls} />
  },
} satisfies Meta<typeof TradeFinder>
export default meta
type Story = StoryObj<typeof meta>
export const Loaded: Story = {
  play: async ({ canvas }) => { await expect(await canvas.findByText('1–2 of 2 scored trades')).toBeVisible() },
}
export const WithDetails: Story = {
  play: async ({ canvas }) => {
    await userEvent.click((await canvas.findAllByRole('button', { name: 'Details' }))[0])
    await expect(await canvas.findByRole('button', { name: 'Show their full lineup' })).toBeVisible()
  },
}
export const Loading: Story = { beforeEach: () => mockFetch([{ path: '/v1/trade/candidates', delay: 'never' }, ...routes().slice(1)]) }
export const Error: Story = { beforeEach: () => mockFetch([{ path: '/v1/trade/candidates', status: 503, body: { detail: 'Trade candidates temporarily unavailable.' } }, ...routes().slice(1)]) }
export const Empty: Story = { beforeEach: () => mockFetch(routes({ items: [], total: 0 })) }
export const NotComputed: Story = { beforeEach: () => mockFetch([{ path: '/v1/trade/candidates', status: 404, body: { detail: 'Run trade_candidates first.' } }, ...routes().slice(1)]) }
export const Stale: Story = { beforeEach: () => mockFetch(routes({ computed_at: new Date(Date.now() - 48 * 3600000).toISOString() })) }
export const Phone: Story = { globals: { viewport: { value: 'mobile1', isRotated: false } } }
