import type { Meta, StoryObj } from '@storybook/react-vite'
import { Table } from '@mantine/core'
import { expect } from 'storybook/test'
import { espnCold, samplePlayer } from '../../stories/fixtures'
import { ScoreValue } from '../ui/ScoreValue'
import type { LiveBlock } from '../../api/types'
import { InjuryBadge } from './InjuryBadge'
import { LiveBadge, NewsBadge } from './LiveBadge'
import { LiveGameLine } from './LiveGameLine'
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

const liveBlock: LiveBlock = {
  status: 'in_progress', period: 3, clock: '8:42', home_abbr: 'ATL', home_score: 17, away_abbr: 'TB', away_score: 14,
  possession: 'ATL', yard_line: 'TB 12', red_zone: true, stat_line: { rushYd: 78, rushTD: 1, rec: 3, recYd: 22 },
  live_points: 14.2, updated_at: null, kickoff: '2026-11-29T21:25:00Z',
}

function liveCard(live: LiveBlock | null, team = 'ATL', extra?: React.ReactNode): Story['args'] {
  return {
    variant: 'card',
    player: { ...samplePlayer, name: 'Sample Back', position: 'RB', team, live },
    badges: <><LiveBadge live={live} />{extra}</>,
    meta: <LiveGameLine live={live} team={team} />,
    stats: 'Actual 14.2 · Proj 22.4',
  }
}

/** In progress: green Live badge, pulsing avatar dot, tinted border, red zone in the outgoing color. */
export const LiveRedZone: Story = {
  args: liveCard(liveBlock),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Live')).toBeVisible()
    await expect(canvas.getByText('ATL ball · TB 12')).toBeVisible()
  },
}

export const LiveBetweenTheTwenties: Story = {
  args: liveCard({ ...liveBlock, red_zone: false, yard_line: 'ATL 38', possession: 'TB' }, 'TB'),
}

export const Upcoming: Story = {
  args: liveCard({ status: 'not_started', period: null, clock: null, home_abbr: 'ATL', away_abbr: 'GB', home_score: null, away_score: null,
    possession: null, yard_line: null, red_zone: null, stat_line: null, live_points: null, updated_at: null, kickoff: '2026-11-29T21:25:00Z' }),
}

export const UpcomingWithoutKickoff: Story = {
  args: liveCard({ ...liveBlock, status: 'not_started', kickoff: null, stat_line: null, home_score: null, away_score: null }),
}

export const FinalWin: Story = {
  args: liveCard({ ...liveBlock, status: 'final', home_abbr: 'BUF', away_abbr: 'MIA', home_score: 31, away_score: 20 }, 'BUF'),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('W 31–20 vs MIA')).toBeVisible()
  },
}

export const FinalLoss: Story = {
  args: liveCard({ ...liveBlock, status: 'final', home_abbr: 'BUF', away_abbr: 'MIA', home_score: 31, away_score: 20 }, 'MIA'),
}

/** News under 24 hours old gets a clay badge next to the game state. */
export const LiveWithNews: Story = {
  args: liveCard(liveBlock, 'ATL', <><InjuryBadge status="QUESTIONABLE" /><NewsBadge hasRecentNews /></>),
}

/** Unknown values show a dash, never zero. */
export const LiveUnknownValues: Story = {
  args: liveCard({ ...liveBlock, period: null, clock: null, home_score: null, away_score: null, possession: null, stat_line: null }),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('TB —–— ATL')).toBeVisible()
  },
}
