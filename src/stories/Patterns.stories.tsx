import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge, Group, Stack } from '@mantine/core'
import { expect, userEvent, within } from 'storybook/test'
import { PageHeader } from '../components/ui/PageHeader'
import { InfoTip } from '../components/ui/InfoTip'
import { StatTile } from '../components/ui/StatTile'
import { StrengthChip } from '../components/ui/StrengthChip'
import { CandidateStatus } from '../components/tradeFinder/TradeCandidateRow'
import { candidate } from '../components/tradeFinder/fixtures'
import { tradeGlossary } from '../components/tradeScore/tradeGlossary'
import '../components/tradeFinder/tradeFinder.css'

// The documentation lives in Patterns.mdx; these stories are the live examples it embeds.
const meta = { title: 'Patterns', parameters: { layout: 'padded' } } satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const PageHeaderWithPills: Story = {
  render: () => <Stack gap="md">
    <PageHeader title="Trades" level={1} subtitle="Week 5 · scored over the next 4 weeks" />
    <Group gap="sm" aria-label="Trade summary">
      <Badge size="lg" variant="light">2 proposals awaiting your approval</Badge>
      <Badge size="lg" color="teal" variant="light">18 proposable trades found</Badge>
      <Badge size="lg" color="yellow" variant="light">Bye crunch: weeks 9, 10</Badge>
      <InfoTip label="a bye crunch">{tradeGlossary.byeCrunch}</InfoTip>
    </Group>
  </Stack>,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: 'Trades' })).toBeVisible()
    await expect(canvas.getByLabelText('Trade summary')).toBeVisible()
  },
}

export const SignedValues: Story = {
  render: () => <Group gap="lg" align="flex-start">
    <StatTile label="Our gain" value={12.6} info={tradeGlossary.ourLineupGain} caption="Good for us" />
    <StatTile label="Their change" value={-2.2} info={tradeGlossary.theirChange} caption="Bad for us" />
    <StatTile label="Final" value={0.02} caption="Inside the neutral zone" />
    <StatTile label="Schedule boost" value={null} caption="Unknown shows a dash" />
    <StrengthChip value={0.84} info />
    <StrengthChip value={-0.62} />
    <StrengthChip value={null} />
  </Group>,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('+12.6')).toBeVisible()
    await expect(canvas.getByText('-2.2')).toBeVisible()
    await expect(canvas.getByText('Strength unknown')).toBeVisible()
  },
}

export const ExplainedTerm: Story = {
  render: () => <p>Opponent <InfoTip label="strength">{tradeGlossary.strength}</InfoTip> adjusts each week's gain.</p>,
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'What is strength?' }))
    await expect(await within(canvasElement.ownerDocument.body).findByRole('tooltip')).toHaveTextContent(tradeGlossary.strength)
  },
}

export const StatusBadges: Story = {
  render: () => <Group gap="lg">
    <CandidateStatus candidate={candidate()} />
    <CandidateStatus candidate={candidate({ status: 'needs_drop', reasons: ['exceeds_roster_limit'] })} />
    <CandidateStatus candidate={candidate({ status: 'one_sided', reasons: ['hurts_counterparty'] })} />
  </Group>,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('✓ Proposable')).toBeVisible()
    await expect(canvas.getByText('Needs a drop')).toBeVisible()
    await expect(canvas.getByText('Hurts them')).toBeVisible()
  },
}
