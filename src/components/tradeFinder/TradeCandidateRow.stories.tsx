import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { mockFetch } from '../../../.storybook/mockFetch'
import { TradeCandidateRow, TradeCandidateHeaders } from './TradeCandidateRow'
import { candidate, finderConfig } from './fixtures'
import { acceptanceScore, completeScore } from '../tradeScore/fixtures'
import './tradeFinder.css'
const meta = {
  title: 'Trade finder/TradeCandidateRow', component: TradeCandidateRow,
  args: { candidate: candidate(), config: finderConfig, week: 5, horizon: 4, runId: 'run-1', selected: false, onSelect: fn() },
  decorators: [(Story) => <div className="finder-list"><div role="table" aria-label="Candidate trades"><TradeCandidateHeaders /><Story /></div></div>],
  beforeEach: () => mockFetch([{ path: '/v1/trade/score', method: 'POST', body: completeScore() }]),
} satisfies Meta<typeof TradeCandidateRow>
export default meta
type Story = StoryObj<typeof meta>
export const Proposable: Story = {}
export const NeedsDrop: Story = { args: { candidate: candidate({ status: 'needs_drop', reasons: ['exceeds_roster_limit'], shape: '2for1' }) } }
export const OneSided: Story = { args: { candidate: candidate({ status: 'one_sided', reasons: ['hurts_counterparty'], counterparty_lineup_change: -2.2 }) } }
export const UnknownScore: Story = { args: { candidate: candidate({ final_score: null, our_lineup_gain: null, complete_horizon: false, scored_weeks: [] }) } }

/** Core sent a null rest-of-season value: it reads "Not available", never 0. */
export const RestOfSeasonUnavailable: Story = { args: { candidate: candidate({ rest_of_season_value: null, acceptance_likelihood: 0.62 }) } }

/** A row stored before the rest-of-season and acceptance fields: both read "—". */
export const OldRowMissingFields: Story = { args: { candidate: candidate() } }

export const RestOfSeasonAndAcceptance: Story = {
  args: { candidate: candidate({ rest_of_season_value: -2.3, costs_playoff_value: true, acceptance_likelihood: 0.62, expected_score: 5.8, acceptance: acceptanceScore().acceptance }) },
}
