import { Anchor, Stack, Table, Text, Title } from '@mantine/core'
import type { PlayerSummary, ScoreBreakdownLine, WeeklyPoints } from '../../api/types'
import { breakdownTotal, formatPoints, weeklyAverage } from './popoverFormat'

interface Props {
  summary: PlayerSummary
  /** Shown as "How is this scored?" only when given. */
  onOpenScoringGuide?: () => void
}

export function PlayerStatsTab({ summary, onOpenScoringGuide }: Props) {
  const breakdown = summary.live?.breakdown
  const log = summary.weekly_log
  const hasBreakdown = !!breakdown && breakdown.length > 0
  const hasLog = !!log && log.length > 0
  return (
    <Stack gap="sm">
      {hasBreakdown && <BreakdownTable lines={breakdown} />}
      {hasLog && <WeeklyLog log={log} />}
      {!hasBreakdown && !hasLog && <Text c="dimmed" size="sm">No stats yet for this player.</Text>}
      {onOpenScoringGuide && (
        <Anchor component="button" type="button" size="sm" onClick={onOpenScoringGuide}>
          How is this scored?
        </Anchor>
      )}
    </Stack>
  )
}

function BreakdownTable({ lines }: { lines: ScoreBreakdownLine[] }) {
  return (
    <>
      <Title order={5}>This week, scored</Title>
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
                <Table.Td ta="right" className="num">{line.qty}</Table.Td>
                <Table.Td><Text size="sm" c="dimmed">{line.rule_label}</Text></Table.Td>
                <Table.Td ta="right" className="num">{formatPoints(line.points, true)}</Table.Td>
              </Table.Tr>
            ))}
            <Table.Tr fw={700}>
              <Table.Td colSpan={3}>Total</Table.Td>
              <Table.Td ta="right" className="num">{formatPoints(breakdownTotal(lines))}</Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </>
  )
}

function WeeklyLog({ log }: { log: WeeklyPoints[] }) {
  return (
    <>
      <Title order={5}>Last {log.length} weeks</Title>
      <Table aria-label="Recent weekly fantasy points" verticalSpacing={4}>
        <Table.Thead>
          <Table.Tr>
            {log.map((w) => <Table.Th key={w.week} ta="right">Wk {w.week}</Table.Th>)}
            <Table.Th ta="right">Avg</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          <Table.Tr>
            {log.map((w) => <Table.Td key={w.week} ta="right" className="num">{formatPoints(w.points)}</Table.Td>)}
            <Table.Td ta="right" fw={600} className="num">{formatPoints(weeklyAverage(log))}</Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>
    </>
  )
}
