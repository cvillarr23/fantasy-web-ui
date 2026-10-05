import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MantineProvider, Table } from '@mantine/core'
import type { ReactNode } from 'react'
import {
  CardListSkeleton,
  ChartSkeleton,
  KpiRowSkeleton,
  ListRowsSkeleton,
  OperationProgress,
  PageSkeleton,
  PlayerListSkeleton,
  TableRowsSkeleton,
  TableSkeleton,
} from '.'

afterEach(cleanup)

const renderInTheme = (ui: ReactNode) => render(<MantineProvider>{ui}</MantineProvider>)

it.each([
  ['table', () => <TableSkeleton columns={3} label="Loading table" />],
  ['player list', () => <PlayerListSkeleton label="Loading players" />],
  ['KPI row', () => <KpiRowSkeleton label="Loading stats" />],
  ['chart', () => <ChartSkeleton label="Loading chart" />],
  ['card list', () => <CardListSkeleton cardClassName="activity-item" label="Loading cards" />],
  ['list rows', () => <ListRowsSkeleton itemClassName="pick-row" label="Loading rows" />],
  ['operation', () => <OperationProgress label="Loading operation" />],
  ['page', () => <PageSkeleton label="Loading page" />],
])('%s skeleton is an announced, busy status region', (_, ui) => {
  renderInTheme(ui())
  const region = screen.getAllByRole('status')[0]
  expect(region.getAttribute('aria-busy')).toBe('true')
  expect(region.getAttribute('aria-label')).toMatch(/^Loading /)
})

it('renders the requested table shape with real headings when given', () => {
  const { container } = renderInTheme(
    <TableSkeleton columns={3} rows={4} headers={['Rank', 'Team', 'Points']} />,
  )
  expect(screen.getByRole('columnheader', { name: 'Team' })).toBeTruthy()
  const bodyRows = container.querySelectorAll('tbody tr')
  expect(bodyRows).toHaveLength(4)
  bodyRows.forEach((row) => expect(row.children).toHaveLength(3))
})

it('can label rows with a header cell to match row-headed grids', () => {
  const { container } = renderInTheme(
    <Table>
      <Table.Tbody>
        <TableRowsSkeleton columns={5} rows={2} rowHeader />
      </Table.Tbody>
    </Table>,
  )
  const firstRow = container.querySelector('tbody tr')!
  expect(firstRow.children[0].tagName).toBe('TH')
  expect(firstRow.children[1].tagName).toBe('TD')
})

it('reuses the real card class so placeholders match the loaded layout', () => {
  const { container } = renderInTheme(
    <CardListSkeleton count={3} className="scoreboard-grid" cardClassName="scoreboard-matchup-card" />,
  )
  expect(container.querySelector('.scoreboard-grid')).not.toBeNull()
  expect(container.querySelectorAll('.scoreboard-matchup-card')).toHaveLength(3)
})
