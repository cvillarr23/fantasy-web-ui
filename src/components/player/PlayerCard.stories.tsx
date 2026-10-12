import type { Meta, StoryObj } from '@storybook/react-vite'
import { Table } from '@mantine/core'
import { expect } from 'storybook/test'
import { samplePlayer } from '../../stories/fixtures'
import { ScoreValue } from '../ui/ScoreValue'
import { InjuryBadge } from './InjuryBadge'
import { PlayerCard } from './PlayerCard'

const meta = {
  title: 'Player/PlayerCard',
  component: PlayerCard,
  args: { player: samplePlayer, variant: 'row' },
  argTypes: { variant: { control: 'inline-radio', options: ['row', 'tableRow', 'card', 'listItem'] } },
} satisfies Meta<typeof PlayerCard>

export default meta
type Story = StoryObj<typeof meta>

export const Row: Story = { args: { stats: <span className="candidate-score">VORP 8.4</span> } }

export const Card: Story = {
  args: { variant: 'card', badges: <InjuryBadge status="QUESTIONABLE" />, stats: 'Proj 21.2' },
}

export const ListItem: Story = {
  args: { variant: 'listItem', before: <span className="pick-number">#14</span> },
  decorators: [(Story) => <ul className="pick-list"><Story /></ul>],
}

export const TableRow: Story = {
  args: {
    variant: 'tableRow',
    columns: [<ScoreValue key="a" value={18.4} />, <ScoreValue key="p" value={21.2} projected />],
  },
  decorators: [(Story) => <Table><Table.Tbody><Story /></Table.Tbody></Table>],
}

/** Missing position, team and headshot: the meta line is left out instead of showing blanks. */
export const MinimalData: Story = {
  args: { player: { id: '9009', name: 'Sample Unknown' } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Sample Unknown')).toBeVisible()
  },
}
