import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Alert, Badge, Group, Select, Table, Text } from '@mantine/core'
import { Link, useNavigate } from 'react-router-dom'
import {
  getJobs,
  getRuns,
  RUNS_PAGE_SIZE,
  type RunFilters,
  type RunStatus,
  type TriggerType,
} from '../api/runs'
import { EmptyState } from './ui/EmptyState'
import { duration, runLabel, runStamp } from './runFormat'
import { ErrorAlert } from './ui/ErrorAlert'
import { Pager } from './ui/Pager'
import { CardListSkeleton } from './skeletons'

const ACTIVE_POLL_MS = 5000
const IDLE_POLL_MS = 30_000

const TRIGGER_LABELS: Record<TriggerType, string> = {
  schedule: 'Scheduled',
  queue: 'Queue message',
  http: 'API request',
  manual: 'Manual',
}
const STATUS_COLORS: Record<RunStatus, string> = {
  running: 'blue',
  success: 'teal',
  failure: 'red',
}

export function TriggerBadge({ type }: { type: TriggerType }) {
  return (
    <Badge variant="light" color="gray">
      {TRIGGER_LABELS[type] ?? type}
    </Badge>
  )
}
export function StatusBadge({ status }: { status: RunStatus }) {
  return <Badge color={STATUS_COLORS[status] ?? 'gray'}>{runLabel(status)}</Badge>
}

/** Latest run per job, plus any dead-lettered queue messages, above the run table. */
function JobHealthStrip({ onPickJob }: { onPickJob: (job: string) => void }) {
  const jobs = useQuery({ queryKey: ['run-jobs'], queryFn: getJobs, refetchInterval: IDLE_POLL_MS })
  if (jobs.error) return <ErrorAlert>Could not load job health: {jobs.error.message}</ErrorAlert>
  if (!jobs.data) return null
  const deadLetters = jobs.data.dead_letters?.filter((q) => q.messages > 0) ?? []
  return (
    <>
      {jobs.data.dead_letters === null && (
        <Alert color="yellow">Dead-letter queues could not be checked: the broker is unreachable.</Alert>
      )}
      {deadLetters.length > 0 && (
        <Alert color="red" title="Dead-lettered queue messages">
          {deadLetters.map((q) => `${q.queue}: ${q.messages}`).join(' · ')}. These actions failed
          for good and nothing retries them; inspect them in the RabbitMQ console.
        </Alert>
      )}
      <details open>
        <summary>Jobs · {jobs.data.items.length} reporting</summary>
        <Group mt="sm" align="stretch">
          {jobs.data.items.map((job) => (
            <button
              type="button"
              className="activity-item job-health"
              key={job.job_name}
              onClick={() => onPickJob(job.job_name)}
            >
              <Group justify="space-between" gap="xs">
                <Text fw={600}>{runLabel(job.job_name)}</Text>
                <StatusBadge status={job.status} />
              </Group>
              <Text size="xs" c="dimmed">
                Last run {runStamp(job.started_at)}
              </Text>
              {job.recent_failures > 0 && (
                <Text size="xs" c="red">
                  {job.recent_failures} of last 10 runs failed
                </Text>
              )}
            </button>
          ))}
        </Group>
      </details>
    </>
  )
}

export function RunsPanel() {
  const navigate = useNavigate()
  const [offset, setOffset] = useState(0)
  const [filters, setFilters] = useState<RunFilters>({})
  const runs = useQuery({
    queryKey: ['runs', offset, filters],
    queryFn: () => getRuns(offset, filters),
    placeholderData: keepPreviousData,
    refetchInterval: (q) =>
      q.state.data?.items.some((r) => r.status === 'running') ? ACTIVE_POLL_MS : IDLE_POLL_MS,
  })
  const jobs = useQuery({ queryKey: ['run-jobs'], queryFn: getJobs })
  const update = (next: RunFilters) => {
    setOffset(0)
    setFilters({ ...filters, ...next })
  }
  return (
    <>
      <JobHealthStrip onPickJob={(job) => update({ job })} />
      <Group align="end">
        <Select
          label="Job"
          placeholder="All jobs"
          clearable
          data={(jobs.data?.items ?? []).map((j) => ({ value: j.job_name, label: runLabel(j.job_name) }))}
          value={filters.job ?? null}
          onChange={(job) => update({ job: job ?? undefined })}
        />
        <Select
          label="Status"
          placeholder="Any status"
          clearable
          data={[
            { value: 'success', label: 'Success' },
            { value: 'failure', label: 'Failure' },
            { value: 'running', label: 'Running' },
          ]}
          value={filters.status || null}
          onChange={(status) => update({ status: (status as RunStatus) ?? '' })}
        />
        <Select
          label="Trigger"
          placeholder="Any trigger"
          clearable
          data={Object.entries(TRIGGER_LABELS).map(([value, label]) => ({ value, label }))}
          value={filters.trigger || null}
          onChange={(trigger) => update({ trigger: (trigger as TriggerType) ?? '' })}
        />
      </Group>
      {runs.isPending && (
        <CardListSkeleton label="Loading runs" cardClassName="activity-item" count={6} lineHeight={18} />
      )}
      {runs.error && <ErrorAlert onRetry={() => void runs.refetch()}>Could not load runs: {runs.error.message}</ErrorAlert>}
      {runs.data?.items.length === 0 && <EmptyState>No runs match these filters.</EmptyState>}
      {runs.data && runs.data.items.length > 0 && (
        <Table.ScrollContainer minWidth={820}>
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Job</Table.Th>
                <Table.Th>Trigger</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Started</Table.Th>
                <Table.Th>Duration</Table.Th>
                <Table.Th>In → out</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {runs.data.items.map((run) => (
                <Table.Tr
                  key={run.id}
                  className="run-row"
                  onClick={() => navigate(`/activity/runs/${run.id}`)}
                >
                  <Table.Td>
                    <Link to={`/activity/runs/${run.id}`}>{runLabel(run.job_name)}</Link>
                  </Table.Td>
                  <Table.Td>
                    <TriggerBadge type={run.trigger_type} />
                  </Table.Td>
                  <Table.Td>
                    <StatusBadge status={run.status} />
                  </Table.Td>
                  <Table.Td>{runStamp(run.started_at)}</Table.Td>
                  <Table.Td>{duration(run)}</Table.Td>
                  <Table.Td>
                    {run.input_count} → {run.output_count}
                    {run.llm_count > 0 && ` · ${run.llm_count} LLM`}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
      <Pager
        previousDisabled={!offset}
        nextDisabled={(runs.data?.items.length ?? 0) < RUNS_PAGE_SIZE}
        onPrevious={() => setOffset(Math.max(0, offset - RUNS_PAGE_SIZE))}
        onNext={() => setOffset(offset + RUNS_PAGE_SIZE)}
      />
    </>
  )
}
