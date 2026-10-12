import type { Meta, StoryObj } from '@storybook/react-vite'
import { Table } from '@mantine/core'
import { expect } from 'storybook/test'
import {
  CardListSkeleton,
  ChartSkeleton,
  KpiRowSkeleton,
  ListRowsSkeleton,
  MoveSidesSkeleton,
  OperationProgress,
  PageHeaderSkeleton,
  PageSkeleton,
  PlayerListSkeleton,
  PlayerRowSkeleton,
  SkeletonRegion,
  StatTileSkeleton,
  TableRowsSkeleton,
  TableSkeleton,
  TextSkeleton,
} from '.'

/** Layout-matched loading placeholders. Every root is an `aria-busy` status region with no
 * "loading" text; `LoadingStates.test.tsx` holds pages to that. */
const meta = {
  title: 'UI/Skeletons',
  component: SkeletonRegion,
  args: { label: 'Loading example', children: <TextSkeleton /> },
} satisfies Meta<typeof SkeletonRegion>

export default meta
type Story = StoryObj<typeof meta>

export const Text: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status', { name: 'Loading example' })).toHaveAttribute('aria-busy', 'true')
  },
}
export const Page: Story = { render: () => <PageSkeleton /> }
export const PageHeader: Story = { render: () => <PageHeaderSkeleton /> }
export const TableFull: Story = { name: 'Table', render: () => <TableSkeleton columns={4} rows={5} headers={['Player', 'Pos', 'Actual', 'Projected']} label="Loading table" /> }
export const TableRows: Story = {
  render: () => (
    <Table>
      <Table.Thead><Table.Tr><Table.Th>Player</Table.Th><Table.Th>Pos</Table.Th><Table.Th>Points</Table.Th></Table.Tr></Table.Thead>
      <Table.Tbody><TableRowsSkeleton columns={3} rows={4} /></Table.Tbody>
    </Table>
  ),
}
export const ListRows: Story = { render: () => <ListRowsSkeleton rows={4} itemClassName="pick-row" label="Loading list" /> }
export const PlayerRow: Story = { render: () => <PlayerRowSkeleton variant="row" /> }
export const PlayerList: Story = { render: () => <PlayerListSkeleton /> }
export const StatTile: Story = { render: () => <StatTileSkeleton /> }
export const KpiRow: Story = { render: () => <KpiRowSkeleton count={4} /> }
export const Chart: Story = { render: () => <ChartSkeleton height={200} /> }
export const CardList: Story = { render: () => <CardListSkeleton cardClassName="trade-offer-card" /> }
export const MoveSides: Story = { render: () => <MoveSidesSkeleton /> }
export const Operation: Story = { render: () => <OperationProgress label="Submitting lineup" /> }
