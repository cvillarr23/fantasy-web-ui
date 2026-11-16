import type { Meta, StoryObj } from '@storybook/react-vite'
import { Table } from '@mantine/core'
import { expect } from 'storybook/test'
import { espnCold, samplePlayer } from '../../stories/fixtures'
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

/** Start% under 25 turns the start figure orange so a bad player stands out. */
export const ColdEspnSignal: Story = {
  args: { player: { ...samplePlayer, name: 'Sample Cold Receiver', position: 'WR', espn: espnCold } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('6%')).toBeVisible()
  },
}

/** No ESPN data: the market line is left out entirely. */
export const NoEspnSignal: Story = {
  args: { player: { ...samplePlayer, espn: null } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText('ESPN')).toBeNull()
  },
}

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
