import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { mockFetch } from '../../../.storybook/mockFetch'
import type { PlayerSearchResult } from '../../api/types'
import { TradeScorePanel } from './TradeScorePanel'
import { completeScore } from './fixtures'

const player = (player_id: string, espn_id: string | null, name: string): PlayerSearchResult => ({
  player_id, espn_id, name, position: 'RB', team: 'KC', injury_status: null, vorp_score: null, projected_points: null,
})

/** Scores a draft trade through `POST /v1/trade/score` and shows the breakdown. */
const meta = {
  title: 'Trade score/TradeScorePanel',
  component: TradeScorePanel,
  args: {
    config: { league_id: '123', team_id: '7', season: 2026, mode: 'live' },
    week: 5,
    incoming: [player('p200', '200', 'Received Wideout')],
    outgoing: [player('p100', '100', 'Sent Back')],
    controls: { counterpartyTeamId: '8', onCounterpartyTeamChange: fn(), horizon: 4, onHorizonChange: fn() },
  },
  beforeEach: () =>
    mockFetch([
      { path: /^\/v1\/trade\/context/, delay: 'never' },
      { path: '/v1/trade/score', method: 'POST', body: completeScore() },
    ]),
} satisfies Meta<typeof TradeScorePanel>

export default meta
type Story = StoryObj<typeof meta>

export const Ready: Story = {}

export const Scored: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Score trade' }))
    await expect(await canvas.findByText('Weeks 5–8 · 4 of 4 scored')).toBeVisible()
  },
}

export const Scoring: Story = {
  beforeEach: () => mockFetch([{ path: /^\/v1\/trade\/context/, delay: 'never' }, { path: '/v1/trade/score', method: 'POST', delay: 'never' }]),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Score trade' }))
  },
}

export const ScoreError: Story = {
  beforeEach: () =>
    mockFetch([
      { path: /^\/v1\/trade\/context/, delay: 'never' },
      { path: '/v1/trade/score', method: 'POST', status: 422, body: { detail: 'week is outside the season' } },
    ]),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Score trade' }))
    await expect(await canvas.findByText(/The scorer rejected the request/)).toBeVisible()
  },
}

/** The panel explains why it can't score yet instead of sending a bad request. */
export const MissingCounterparty: Story = {
  args: { controls: { counterpartyTeamId: '', onCounterpartyTeamChange: fn(), horizon: 4, onHorizonChange: fn() } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Score trade' })).toBeDisabled()
  },
}
