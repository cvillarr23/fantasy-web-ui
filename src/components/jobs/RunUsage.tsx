import { Table, Text } from '@mantine/core'
import type { Run } from '../../api/runs'
import { averageCores, formatBytes, formatCores, formatCpuSeconds, runResources, shareOf } from './usageFormat'

function limitText(value: string, share: string) {
  return share ? `${value} (${share} of limit)` : value
}

/** The CPU and memory a finished launcher run recorded about itself. */
export function RunUsage({ run }: { run: Run }) {
  const resources = runResources(run.summary)
  if (!resources) {
    if (!run.executor || run.status === 'queued' || run.status === 'running' || run.status === 'skipped') return null
    return (
      <section>
        <h3>Resources</h3>
        <Text size="sm" c="dimmed">This run recorded no usage. A run killed by its memory limit or deadline records none.</Text>
      </section>
    )
  }
  const cores = averageCores(resources)
  const limits = resources.limits
  const rows: [string, string][] = [
    ['CPU time', formatCpuSeconds(resources.cpu_seconds)],
    ['Average CPU', limitText(formatCores(cores), shareOf(cores, limits?.cpu_cores))],
    ['Peak memory', limitText(formatBytes(resources.peak_memory_bytes), shareOf(resources.peak_memory_bytes, limits?.memory_bytes))],
  ]
  if (resources.cpu_throttled_seconds) {
    rows.push(['Throttled', `${resources.cpu_throttled_seconds.toFixed(2)}s held back by the CPU limit`])
  }
  return (
    <section>
      <h3>Resources</h3>
      <Table className="run-counters" withRowBorders={false}>
        <Table.Tbody>
          {rows.map(([label, value]) => (
            <Table.Tr key={label}>
              <Table.Th w={180}>{label}</Table.Th>
              <Table.Td>{value}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      {resources.source === 'rusage' && (
        <Text size="xs" c="dimmed">Measured for the job's own process only, without its container's limits.</Text>
      )}
    </section>
  )
}
