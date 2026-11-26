import { Anchor, Stack, Table, Text, Title } from '@mantine/core'
import type { PlayerSummary, WeeklyPoints } from '../../api/types'
import { BreakdownTable } from './BreakdownTable'
import { formatPoints, weeklyAverage } from './popoverFormat'

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
      {hasBreakdown && (
        <>
          <Title order={5}>This week, scored</Title>
          <BreakdownTable lines={breakdown} />
        </>
      )}
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
