import { Table, Text } from '@mantine/core'
import type { JobResources, JobResourceSuggestion, ResourceSuggestions as Report } from '../../api/jobs'
import { EmptyState } from '../ui/EmptyState'
import { formatBytes, formatCores } from './usageFormat'

const REASONS: Record<NonNullable<JobResourceSuggestion['reason']>, string> = {
  no_measured_runs: 'No measured runs yet',
  insufficient_runs: 'Too few runs to suggest',
}

const quantities = (resources: JobResources) =>
  `${resources.requests.cpu} / ${resources.requests.memory} → ${resources.limits.cpu} / ${resources.limits.memory}`

/** "CPU p95 120m · memory p95 98 MiB · max 140 MiB". */
function measured(job: JobResourceSuggestion) {
  const cores = job.usage?.avg_cpu_cores
  const memory = job.usage?.peak_memory_bytes
  if (!cores && !memory) return '—'
  return [
    cores && `CPU p95 ${formatCores(cores.p95)}`,
    memory && `memory p95 ${formatBytes(memory.p95)} · max ${formatBytes(memory.max)}`,
  ]
    .filter(Boolean)
    .join(' · ')
}

function SuggestedCell({ job }: { job: JobResourceSuggestion }) {
  if (!job.suggested) return <Text size="sm" c="dimmed">{job.reason ? REASONS[job.reason] : '—'}</Text>
  const unchanged = quantities(job.suggested) === quantities(job.current)
  return (
    <Text size="sm" fw={unchanged ? undefined : 600}>
      {quantities(job.suggested)}
      {job.suggested.cpu_throttled && <Text span size="xs" c="dimmed"> · CPU limit is throttling</Text>}
    </Text>
  )
}

/** Each job's measured usage next to its catalog resources and what the runs suggest. */
export function ResourceSuggestions({ report }: { report: Report }) {
  if (report.jobs.length === 0) return <EmptyState>No jobs to size.</EmptyState>
  return (
    <>
      <Text size="sm" c="dimmed" px={16}>
        From successful runs in the last {report.days} days; a job needs {report.min_runs} to get a suggestion.
        Values are CPU / memory requests → limits.
      </Text>
      <Table className="resource-suggestions" verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Job</Table.Th>
            <Table.Th>Runs</Table.Th>
            <Table.Th>Measured</Table.Th>
            <Table.Th>Catalog</Table.Th>
            <Table.Th>Suggested</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {report.jobs.map((job) => (
            <Table.Tr key={job.name}>
              <Table.Td>{job.name}</Table.Td>
              <Table.Td>{job.runs}</Table.Td>
              <Table.Td>{measured(job)}</Table.Td>
              <Table.Td>{quantities(job.current)}</Table.Td>
              <Table.Td><SuggestedCell job={job} /></Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </>
  )
}
