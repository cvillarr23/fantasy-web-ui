import { useQuery } from '@tanstack/react-query'
import { Anchor, Badge, Button, Group, Stack, Table, Text } from '@mantine/core'
import { Link, useParams } from 'react-router-dom'
import {
  getRun,
  getTrace,
  type LinkedRow,
  type RefType,
  type RunSummary,
  type TraceRoot,
  type TraceStage,
} from '../api/runs'
import { ErrorAlert } from './ui/ErrorAlert'
import { EmptyState } from './ui/EmptyState'
import { TextSkeleton, SkeletonRegion } from './skeletons'
import { StatusBadge, TriggerBadge } from './RunsPanel'
import {
  duration,
  logIssues,
  plural,
  RESERVED_SUMMARY_KEYS,
  runLabel,
  runOutcome,
  runStamp,
} from './runFormat'

const RUNNING_POLL_MS = 5000
const PERCENT = 100

const REF_TITLES: Record<RefType, string> = {
  raw_signal: 'News articles',
  rumor_signal: 'Rumor evaluations',
  llm_session: 'LLM sessions',
  activity_action: 'Roster moves',
}
const TRACEABLE: RefType[] = ['raw_signal', 'rumor_signal', 'activity_action']
const STAGE_REF_TYPES: Partial<Record<TraceStage['key'], RefType>> = {
  ingest: 'raw_signal',
  evaluation: 'rumor_signal',
  submission: 'activity_action',
}

function text(value: unknown) {
  return value == null ? '' : String(value)
}

function TraceLink({ refType, id }: { refType: RefType; id: string }) {
  if (!TRACEABLE.includes(refType)) return null
  return (
    <Anchor component={Link} size="xs" to={`/activity/trace/${refType}/${encodeURIComponent(id)}`}>
      Trace
    </Anchor>
  )
}

/** One linked article, rumor verdict, LLM session or move. */
export function LinkedItem({ refType, row }: { refType: RefType; row: LinkedRow }) {
  if (row.missing) {
    return (
      <div className="timeline-event">
        <Text size="sm" c="dimmed">
          {runLabel(refType)} {row.id} (no longer stored)
        </Text>
      </div>
    )
  }
  if (refType === 'raw_signal') {
    return (
      <div className="timeline-event">
        <Group gap="xs">
          <Badge variant="light">{runLabel(text(row.source))}</Badge>
          <Text fw={600}>{text(row.player_name) || 'Unmatched player'}</Text>
          <TraceLink refType={refType} id={row.id} />
        </Group>
        <Text size="sm">{text(row.text)}</Text>
        {typeof row.url === 'string' && row.url && (
          <Anchor href={row.url} target="_blank" rel="noreferrer" size="xs">
            Source article
          </Anchor>
        )}
      </div>
    )
  }
  if (refType === 'rumor_signal') {
    return (
      <div className="timeline-event">
        <Group gap="xs">
          <Text fw={600}>{text(row.player_name) || text(row.player_id)}</Text>
          <Badge variant="light">{text(row.sentiment)}</Badge>
          <Badge variant="outline">{runLabel(text(row.suggested_action))}</Badge>
          <Text size="xs" c="dimmed">
            {Math.round(Number(row.confidence) * PERCENT)}% confidence
          </Text>
          <TraceLink refType={refType} id={row.id} />
        </Group>
      </div>
    )
  }
  if (refType === 'llm_session') {
    return (
      <div className="timeline-event">
        <Group gap="xs">
          <Anchor component={Link} to={`/activity/sessions/${encodeURIComponent(row.id)}`}>
            {text(row.title)}
          </Anchor>
          <Badge variant="light">{runLabel(text(row.status))}</Badge>
        </Group>
      </div>
    )
  }
  return (
    <div className="timeline-event">
      <Group gap="xs">
        <Anchor component={Link} to={`/activity/actions/${encodeURIComponent(row.id)}`}>
          {text(row.title)}
        </Anchor>
        <Badge variant="light">{runLabel(text(row.execution))}</Badge>
        <Badge variant="outline">{runLabel(text(row.outcome))}</Badge>
        <TraceLink refType={refType} id={row.id} />
      </Group>
    </div>
  )
}

function RunLinks({ runs }: { runs: RunSummary[] }) {
  return (
    <Group gap="xs">
      {runs.map((run) => (
        <Button
          key={run.id}
          component={Link}
          to={`/activity/runs/${run.id}`}
          variant="light"
          size="xs"
          color={run.status === 'failure' ? 'red' : undefined}
        >
          {runLabel(run.job_name)} · {runStamp(run.started_at)}
        </Button>
      ))}
    </Group>
  )
}

function DetailSkeleton({ label }: { label: string }) {
  return (
    <SkeletonRegion label={label}>
      <TextSkeleton lines={4} />
    </SkeletonRegion>
  )
}

export function RunDetailPage() {
  const { id = '' } = useParams()
  const query = useQuery({
    queryKey: ['run', id],
    queryFn: () => getRun(id),
    refetchInterval: (q) => (q.state.data?.status === 'running' ? RUNNING_POLL_MS : false),
  })
  const run = query.data
  const counters = run
    ? Object.entries(run.summary).filter(([key]) => !RESERVED_SUMMARY_KEYS.has(key))
    : []
  const logTail = Array.isArray(run?.summary.log_tail) ? (run.summary.log_tail as string[]) : []
  const issues = logIssues(run?.summary)
  const outcome = run ? runOutcome({ ...run, error: null }) : ''
  const hasLinks = Boolean(run?.links.input || run?.links.output)
  return (
    <div className="dashboard">
      <Stack>
        <Button component={Link} to="/activity?tab=runs" variant="subtle">
          ← All runs
        </Button>
        {query.error && <ErrorAlert>{query.error.message}</ErrorAlert>}
        {!run && !query.error && <DetailSkeleton label="Loading run" />}
        {run && (
          <>
            <h2>{runLabel(run.job_name)}</h2>
            <Group>
              <StatusBadge status={run.status} />
              <TriggerBadge type={run.trigger_type} />
              <Text size="sm">
                Started {runStamp(run.started_at)} · {duration(run)}
              </Text>
            </Group>
            <Text size="sm" c="dimmed">
              {Object.entries(run.trigger)
                .map(([key, value]) => `${runLabel(key)}: ${text(value)}`)
                .join(' · ')}
            </Text>
            {run.error && <ErrorAlert title="Run failed">{run.error}</ErrorAlert>}
            {run.parent && (
              <Text size="sm">
                Triggered by{' '}
                <Anchor component={Link} to={`/activity/runs/${run.parent.id}`}>
                  {runLabel(run.parent.job_name)} at {runStamp(run.parent.started_at)}
                </Anchor>
              </Text>
            )}
            <section>
              <h3>Outcome</h3>
              {outcome ? (
                <Text>{outcome}</Text>
              ) : (
                <EmptyState>This run recorded no outcome.</EmptyState>
              )}
              {issues.any && (
                <Group gap="xs" mt="xs">
                  {issues.errors > 0 && <Badge color="red">{plural(issues.errors, 'error')} logged</Badge>}
                  {issues.warnings > 0 && (
                    <Badge color="yellow">{plural(issues.warnings, 'warning')} logged</Badge>
                  )}
                </Group>
              )}
            </section>
            {counters.length > 0 && (
              <Table className="run-counters" withRowBorders={false}>
                <Table.Tbody>
                  {counters.map(([key, value]) => (
                    <Table.Tr key={key}>
                      <Table.Th w={180}>{runLabel(key)}</Table.Th>
                      <Table.Td>
                        {value !== null && typeof value === 'object' ? (
                          <pre className="payload">{JSON.stringify(value, null, 2)}</pre>
                        ) : (
                          text(value)
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
            {run.summary.result != null && (
              <details>
                <summary>Bot result</summary>
                <pre className="payload">{JSON.stringify(run.summary.result, null, 2)}</pre>
              </details>
            )}
            {logTail.length > 0 && (
              <details open={!hasLinks || issues.any}>
                <summary>Log · last {logTail.length} lines</summary>
                <pre className="payload run-log">
                  {logTail.map((line, i) => (
                    <span
                      key={i}
                      className={
                        line.startsWith('ERROR') ? 'log-error' : line.startsWith('WARNING') ? 'log-warn' : undefined
                      }
                    >
                      {line}
                      {'\n'}
                    </span>
                  ))}
                </pre>
              </details>
            )}
            {(['input', 'output'] as const).map((role) => {
              const groups = run.links[role]
              if (!groups) return null
              return (
                <section key={role}>
                  <h3>{role === 'input' ? 'Read' : 'Produced'}</h3>
                  {(Object.keys(groups) as RefType[]).map((refType) => (
                    <details key={refType} open={(groups[refType]?.length ?? 0) <= 10}>
                      <summary>
                        {REF_TITLES[refType]} · {groups[refType]?.length}
                      </summary>
                      {groups[refType]?.map((row) => (
                        <LinkedItem key={row.id} refType={refType} row={row} />
                      ))}
                    </details>
                  ))}
                </section>
              )
            })}
            {!hasLinks && (
              <EmptyState>This run read and produced no articles, evaluations or moves.</EmptyState>
            )}
            {run.children.length > 0 && (
              <section>
                <h3>Runs it led to</h3>
                <RunLinks runs={run.children} />
              </section>
            )}
          </>
        )}
      </Stack>
    </div>
  )
}

export function TracePage() {
  const { type = '', id = '' } = useParams()
  const query = useQuery({
    queryKey: ['trace', type, id],
    queryFn: () => getTrace(type as TraceRoot, id),
  })
  return (
    <div className="dashboard">
      <Stack>
        <Button component={Link} to="/activity?tab=runs" variant="subtle">
          ← All runs
        </Button>
        <h2>Trace: {runLabel(type)} {id}</h2>
        <Text size="sm" c="dimmed">
          How a news article flows through the rumor pipeline: ingested, evaluated by the LLM,
          considered by the action trigger, queued as a move and executed by the worker.
        </Text>
        {query.error && <ErrorAlert>{query.error.message}</ErrorAlert>}
        {!query.data && !query.error && <DetailSkeleton label="Loading trace" />}
        {query.data?.stages.map((stage, index) => {
          const refType = STAGE_REF_TYPES[stage.key]
          const empty = !stage.runs.length && !stage.items.length && !stage.sessions.length
          return (
            <section key={stage.key} className="trace-stage">
              <h3>
                {index + 1}. {stage.title}
              </h3>
              {empty && <EmptyState>Nothing recorded at this stage.</EmptyState>}
              {stage.runs.length > 0 && <RunLinks runs={stage.runs} />}
              {stage.sessions.map((session) => (
                <LinkedItem key={session.id} refType="llm_session" row={session} />
              ))}
              {refType &&
                stage.items.map((row) => <LinkedItem key={row.id} refType={refType} row={row} />)}
            </section>
          )
        })}
      </Stack>
    </div>
  )
}
