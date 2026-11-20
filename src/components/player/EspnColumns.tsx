import { Table, UnstyledButton } from '@mantine/core'
import type { EspnOwnership } from '../../api/types'
import { formatChange, formatPosRank, isCold, type EspnSort, type EspnSortKey } from './espnMarket'

const COLUMNS: { key: EspnSortKey; label: string }[] = [
  { key: 'rank', label: 'ESPN Rk' },
  { key: 'start', label: 'Start%' },
  { key: 'bench', label: 'Bench%' },
  { key: 'change', label: 'Δ1d' },
]

function ariaSort(sort: EspnSort | null, key: EspnSortKey) {
  if (sort?.key !== key) return 'none'
  return sort.direction === 'asc' ? 'ascending' : 'descending'
}

/** The four ESPN header cells; each is a button that sorts the table by that column. */
export function EspnHeaders({ sort, onSort }: { sort: EspnSort | null; onSort: (key: EspnSortKey) => void }) {
  return (
    <>
      {COLUMNS.map(({ key, label }) => (
        <Table.Th key={key} aria-sort={ariaSort(sort, key)}>
          <UnstyledButton onClick={() => onSort(key)} fz="inherit" fw="inherit">
            {label}
            {sort?.key === key && (sort.direction === 'asc' ? ' ▴' : ' ▾')}
          </UnstyledButton>
        </Table.Th>
      ))}
    </>
  )
}

function percent(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${Math.round(value)}%`
}

export function EspnCells({ position, espn }: { position?: string | null; espn?: EspnOwnership | null }) {
  const change = formatChange(espn?.percent_change)
  return (
    <>
      <Table.Td title={espn ? 'ESPN positional rank, all leagues' : undefined}>{formatPosRank(position, espn?.pos_rank ?? null) ?? '—'}</Table.Td>
      <Table.Td className={isCold(espn) ? 'espn-cell-cold' : undefined}>{percent(espn?.percent_started)}</Table.Td>
      <Table.Td>{percent(espn?.percent_bench)}</Table.Td>
      <Table.Td className={change ? `espn-change-${change.tone}` : undefined}>{change?.text ?? '—'}</Table.Td>
    </>
  )
}
