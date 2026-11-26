import { Table, Text } from '@mantine/core'
import type { ScoreBreakdownLine } from '../../api/types'
import { breakdownTotal, formatPoints, formatQty } from './popoverFormat'

/** A player's fantasy points one stat at a time: what they did, the league rule and the points,
 * with a Total row. */
export function BreakdownTable({ lines }: { lines: ScoreBreakdownLine[] }) {
  return (
    <Table.ScrollContainer minWidth={320}>
      <Table verticalSpacing={4} aria-label="This week's scoring breakdown">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Stat</Table.Th><Table.Th ta="right">Did</Table.Th>
            <Table.Th>League rule</Table.Th><Table.Th ta="right">Points</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {lines.map((line) => (
            <Table.Tr key={line.stat_key}>
              <Table.Td>{line.label}</Table.Td>
              <Table.Td ta="right" className="num breakdown-qty">{formatQty(line)}</Table.Td>
              <Table.Td><Text size="sm" c="dimmed">{line.rule_label}</Text></Table.Td>
              <Table.Td ta="right" className={line.points < 0 ? 'num error' : 'num'}>{formatPoints(line.points, true)}</Table.Td>
            </Table.Tr>
          ))}
          <Table.Tr fw={700}>
            <Table.Td colSpan={3}>Total</Table.Td>
            <Table.Td ta="right" className="num">{formatPoints(breakdownTotal(lines))}</Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}
