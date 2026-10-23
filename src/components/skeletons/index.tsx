import type { ReactNode } from 'react'
import { Group, Progress, Skeleton, Stack, Table } from '@mantine/core'
import { PageHeader } from '../ui/PageHeader'

// Layout-matched loading placeholders. Each one reuses the CSS classes (or Mantine structure) of
// the content it stands in for, so swapping skeleton -> data doesn't shift the page. Every root
// is an `aria-busy` status region so assistive tech announces the load and tests can find it.

interface RegionProps {
  label?: string
  className?: string
  children: ReactNode
}

export function SkeletonRegion({ label = 'Loading', className, children }: RegionProps) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={className}>
      {children}
    </div>
  )
}

// Ragged widths read as text rather than as a solid block.
const TEXT_WIDTHS = ['90%', '75%', '60%', '82%', '68%']

export function TextSkeleton({ lines = 3, height = 14 }: { lines?: number; height?: number }) {
  return (
    <Stack gap={8}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={height} width={TEXT_WIDTHS[i % TEXT_WIDTHS.length]} />
      ))}
    </Stack>
  )
}

interface TableRowsProps {
  columns: number
  rows?: number
  /** Matches Mantine's default `Table.Td` content height for one line of body text. */
  rowHeight?: number
  /** Render the first cell as a `Table.Th`, for grids whose rows are labelled by a header cell. */
  rowHeader?: boolean
  /** Loaded row height in px, for tables whose cells are taller than one line of text. */
  rowMinHeight?: number
}

// Rows only, for tables whose real header stays visible while the body loads.
export function TableRowsSkeleton({
  columns,
  rows = 5,
  rowHeight = 14,
  rowHeader = false,
  rowMinHeight,
}: TableRowsProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <Table.Tr key={row} aria-busy="true" style={rowMinHeight ? { height: rowMinHeight } : undefined}>
          {Array.from({ length: columns }, (_, col) => {
            const Cell = rowHeader && col === 0 ? Table.Th : Table.Td
            return (
              <Cell key={col}>
                <Skeleton height={rowHeight} width={col === 0 ? '70%' : '50%'} />
              </Cell>
            )
          })}
        </Table.Tr>
      ))}
    </>
  )
}

interface TableProps extends TableRowsProps {
  /** Real column headings when they're known up front; otherwise header cells are skeletons. */
  headers?: string[]
  label?: string
}

export function TableSkeleton({ columns, rows = 8, rowHeight, rowMinHeight, headers, label }: TableProps) {
  return (
    <SkeletonRegion label={label}>
      <Table>
        <Table.Thead>
          <Table.Tr>
            {Array.from({ length: columns }, (_, i) => (
              <Table.Th key={i}>{headers?.[i] ?? <Skeleton height={12} width="60%" />}</Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          <TableRowsSkeleton columns={columns} rows={rows} rowHeight={rowHeight} rowMinHeight={rowMinHeight} />
        </Table.Tbody>
      </Table>
    </SkeletonRegion>
  )
}

interface ListRowsProps {
  rows?: number
  ordered?: boolean
  listClassName?: string
  /** Reuse the real row class so padding and borders match. */
  itemClassName: string
  label?: string
}

// One text bar per row inside the panel's real list: draft candidates, pick feed, comparisons.
export function ListRowsSkeleton({ rows = 4, ordered = false, listClassName, itemClassName, label }: ListRowsProps) {
  const List = ordered ? 'ol' : 'ul'
  return (
    <SkeletonRegion label={label}>
      <List className={listClassName}>
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className={itemClassName}>
            <Skeleton height={14} width="100%" />
          </li>
        ))}
      </List>
    </SkeletonRegion>
  )
}

// Same box as PlayerCard: `card` is the draggable lineup card, `row` the compact inline variant.
export function PlayerRowSkeleton({ variant = 'card' }: { variant?: 'card' | 'row' }) {
  if (variant === 'row') {
    return (
      <div className="player-card-row">
        <Skeleton height={14} width={120} />
        <Skeleton height={10} width={50} />
      </div>
    )
  }
  return (
    <div className="player-card skeleton-player-card">
      <Skeleton height={32} circle />
      <Stack gap={4} style={{ flex: 1 }}>
        <Skeleton height={13} width="55%" />
        <Skeleton height={10} width="35%" />
      </Stack>
    </div>
  )
}

export function PlayerListSkeleton({
  rows = 5,
  variant = 'card',
  label,
}: {
  rows?: number
  variant?: 'card' | 'row'
  label?: string
}) {
  return (
    <SkeletonRegion label={label}>
      <Stack gap={6}>
        {Array.from({ length: rows }, (_, i) => <PlayerRowSkeleton key={i} variant={variant} />)}
      </Stack>
    </SkeletonRegion>
  )
}

export function StatTileSkeleton() {
  return (
    <div>
      <Skeleton height={10} width={60} mb={6} />
      <Skeleton height={14} width={80} />
    </div>
  )
}

export function KpiRowSkeleton({ count = 4, label }: { count?: number; label?: string }) {
  return (
    <SkeletonRegion label={label}>
      <Group gap="lg">
        {Array.from({ length: count }, (_, i) => <StatTileSkeleton key={i} />)}
      </Group>
    </SkeletonRegion>
  )
}

export function ChartSkeleton({ height = 240, label }: { height?: number; label?: string }) {
  return (
    <SkeletonRegion label={label}>
      <Skeleton height={height} radius="md" />
    </SkeletonRegion>
  )
}

// Title plus the control row (week selector / segmented control) that tops most pages.
export function PageHeaderSkeleton({ withControls = true }: { withControls?: boolean }) {
  return (
    <Stack gap="sm" mb="md">
      <Skeleton height={28} width={220} />
      {withControls && (
        <Group gap="sm">
          <Skeleton height={36} width={160} radius="sm" />
          <Skeleton height={36} width={110} radius="sm" />
        </Group>
      )}
    </Stack>
  )
}

interface CardListProps {
  count?: number
  /** Container class: reuse the real grid/list class so columns and gaps match. */
  className?: string
  /** Card class: reuse the real card class so borders and padding match. */
  cardClassName: string
  lines?: number
  lineHeight?: number
  label?: string
}

function ConditionalStack({ stack, children }: { stack: boolean; children: ReactNode }) {
  return stack ? <Stack>{children}</Stack> : <>{children}</>
}

// Bordered cards in their real container: scoreboard cards, activity items, waiver rows.
export function CardListSkeleton({
  count = 4,
  className,
  cardClassName,
  lines = 2,
  lineHeight,
  label,
}: CardListProps) {
  return (
    <SkeletonRegion label={label} className={className}>
      {/* Without a grid/list class of its own, stack the cards like the page's Stack does. */}
      <ConditionalStack stack={!className}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className={cardClassName}>
            <TextSkeleton lines={lines} height={lineHeight} />
          </div>
        ))}
      </ConditionalStack>
    </SkeletonRegion>
  )
}

// The incoming/outgoing comparison used by waiver recommendations and move review.
export function MoveSidesSkeleton() {
  return (
    <div className="move-sides">
      {['incoming', 'outgoing'].map((side) => (
        <div key={side} className={`move-side ${side}`}>
          <Skeleton height={14} width="45%" mb={10} />
          <Skeleton height={16} width="60%" mb={6} />
          <Skeleton height={12} width="40%" />
        </div>
      ))}
    </div>
  )
}

// Generic route-level fallback: lazy chunk loads and pages still resolving their config.
// A known `title` renders the real page heading, so it doesn't jump when the page loads.
export function PageSkeleton({ label = 'Loading page', title }: { label?: string; title?: string }) {
  return (
    <div className="dashboard">
      {title && <PageHeader title={title} level={1} />}
      <SkeletonRegion label={label}>
        {!title && <PageHeaderSkeleton />}
        <TableSkeleton columns={4} rows={6} />
      </SkeletonRegion>
    </div>
  )
}

// Inline "still working" bar for a known-slow operation (move solve, claim/trade submission),
// placed in the panel next to the control that triggered it. Mantine has no indeterminate
// Progress, so a full striped bar stands in; reduced-motion CSS stops its animation.
export function OperationProgress({ label }: { label: string }) {
  return (
    <SkeletonRegion label={label}>
      <Progress value={100} striped animated size="xs" />
    </SkeletonRegion>
  )
}
