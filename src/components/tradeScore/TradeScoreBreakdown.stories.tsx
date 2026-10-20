import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { TradeScoreBreakdown } from './TradeScoreBreakdown'
import { completeScore, partialScore, unscoredScore } from './fixtures'

const teamNames = { '3': 'Strong Opponent', '5': 'Weak Opponent', '7': 'Our Team', '8': 'Rival Team' }

/** Shows core's deterministic trade score and its evidence. The UI never rescores. */
const meta = {
  title: 'Trade score/TradeScoreBreakdown',
  component: TradeScoreBreakdown,
  args: { score: completeScore(), teamNames },
} satisfies Meta<typeof TradeScoreBreakdown>

export default meta
type Story = StoryObj<typeof meta>

export const Complete: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole('table', { name: 'Score terms' })).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'What is our weight?' }))
    await waitFor(() => expect(within(canvasElement.ownerDocument.body).getByRole('tooltip')).toBeVisible())
    await expect(within(canvasElement.ownerDocument.body).getByRole('tooltip')).toHaveTextContent('1 + 0.25 × clamp(z, −2, 2)')
  },
}

export const PartialHorizon: Story = { args: { score: partialScore() } }

/** No scored weeks: every term is unknown and shows "—" or an explanation, not zero. */
export const Unscored: Story = { args: { score: unscoredScore() } }

/** Without team names the breakdown falls back to team IDs. */
export const NoTeamNames: Story = { args: { teamNames: undefined } }

export const Phone: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvasElement.ownerDocument.defaultView!.innerWidth).toBeLessThanOrEqual(480)
    const trigger = canvas.getByRole('button', { name: 'What is our weight?' })
    const page = within(canvasElement.ownerDocument.body)
    await userEvent.pointer({ keys: '[TouchA]', target: trigger })
    await waitFor(() => expect(page.getByRole('tooltip')).toBeVisible())
    await expect(page.getByRole('tooltip')).toHaveTextContent('1 + 0.25 × clamp(z, −2, 2)')
    await userEvent.pointer({ keys: '[TouchA]', target: trigger })
    await waitFor(() => expect(page.queryByRole('tooltip')).not.toBeInTheDocument())
    const table = canvas.getByRole('table', { name: 'Weekly score evidence' })
    await expect(within(table.querySelector('tbody')!).queryByRole('button')).not.toBeInTheDocument()
  },
}

const customWeightsScore = completeScore()
customWeightsScore.weights = { strength_weight: 0.4, z_clamp: 1.5, indirect_factor: 0.1 }
export const CustomWeights: Story = {
  args: { score: customWeightsScore },
  play: async ({ canvas, canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    const ourWeight = canvas.getByRole('button', { name: 'What is our weight?' })
    await userEvent.pointer({ keys: '[TouchA]', target: ourWeight })
    await waitFor(() => expect(page.getByRole('tooltip')).toBeVisible())
    await expect(page.getByRole('tooltip')).toHaveTextContent('1 + 0.4 × clamp(z, −1.5, 1.5), ranging from 0.4 to 1.6')
    await userEvent.pointer({ keys: '[TouchA]', target: ourWeight })
    await waitFor(() => expect(page.queryByRole('tooltip')).not.toBeInTheDocument())
    await userEvent.pointer({ keys: '[TouchA]', target: canvas.getByRole('button', { name: 'What is their weight?' }) })
    await waitFor(() => expect(page.getByRole('tooltip')).toBeVisible())
    await expect(page.getByRole('tooltip')).toHaveTextContent('0.1 times their opponent multiplier')
  },
}

const partialWeightsScore = completeScore()
partialWeightsScore.weights = { strength_weight: 0.25 } as typeof partialWeightsScore.weights
export const PartialWeights: Story = {
  args: { score: partialWeightsScore },
  play: async ({ canvas, canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    await userEvent.pointer({ keys: '[TouchA]', target: canvas.getByRole('button', { name: 'What is our weight?' }) })
    await waitFor(() => expect(page.getByRole('tooltip')).toBeVisible())
    await expect(page.getByRole('tooltip')).not.toHaveTextContent(/undefined|NaN|Infinity|clamp|×/)
    await expect(page.getByRole('tooltip')).toHaveTextContent('Adjusts a lineup gain for fantasy opponent strength.')
    await expect(canvas.getByRole('button', { name: 'What is cost of helping them (c*)?' })).toBeVisible()
  },
}
