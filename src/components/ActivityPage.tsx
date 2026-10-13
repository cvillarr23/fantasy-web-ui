import { useEffect, useRef, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  Alert,
  Badge,
  Button,
  Group,
  SegmentedControl,
  Skeleton,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CardListSkeleton, SkeletonRegion, TextSkeleton } from './skeletons'
import {
  checkAction,
  getAction,
  getActions,
  getSession,
  getSessions,
  markActivityRead,
  type ActivityAction,
} from '../api/dashboard'
import { request } from '../api/client'
import { queryClient, invalidateRoster } from '../api/queryClient'
import { actionDependency, dependencyEvent, isHeldAction } from './activityDependency'
import { Pager } from './ui/Pager'
import { PageHeader } from './ui/PageHeader'
import { RunsPanel } from './RunsPanel'

const label = (value: string) => value.replaceAll('_', ' ')
const stamp = (value: string) => new Date(value).toLocaleString()
function DependencyBadge({ action }: { action: ActivityAction }) {
  const dependency = actionDependency(action)
  return dependency && <Badge color={dependency.color}>{dependency.label}</Badge>
}
function Payload({ value }: { value: unknown }) {
  return (
    <pre className="payload">
      {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
    </pre>
  )
}
// Title, status badges and a few timeline events: the shape shared by both detail pages.
function ActivityDetailSkeleton({ label }: { label: string }) {
  return (
    <SkeletonRegion label={label}>
      <Stack>
        <Skeleton height={30} width="50%" />
        <Group>
          <Skeleton height={20} width={90} radius="xl" />
          <Skeleton height={20} width={90} radius="xl" />
        </Group>
        <TextSkeleton lines={2} />
        {Array.from({ length: 3 }, (_, i) => (
          <div className="timeline-event" key={i}>
            <TextSkeleton lines={2} />
          </div>
        ))}
      </Stack>
    </SkeletonRegion>
  )
}

export function ActivityIndicator() {
  const query = useQuery({
    queryKey: ['activity-indicator'],
    queryFn: () => getActions(0, false, false),
    refetchInterval: 30_000,
  })
  const seen = useRef<Set<string> | null>(null)
  useEffect(() => {
    if (!query.data) return
    const verified = new Set(
      query.data.items
        .filter((item) => item.outcome === 'verified_complete')
        .map((item) => item.id),
    )
    if (seen.current && [...verified].some((id) => !seen.current!.has(id))) void invalidateRoster()
    seen.current = verified
  }, [query.data])
  if (!query.data)
    return (
      <Button component={Link} to="/activity" variant="subtle" size="xs">
        Activity
      </Button>
    )
  const active = query.data.items.filter((a) =>
    ['queued', 'delivered', 'running'].includes(a.execution),
  ).length
  const unread = query.data.items.filter((a) => a.unread).length
  return (
    <Button component={Link} to="/activity" variant="light" size="xs">
      {active ? `${active} working` : 'Activity'}
      {unread ? ` · ${unread} unread` : ''}
    </Button>
  )
}
export function ActivityPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'submissions'
  const bots = useQuery({
    queryKey: ['activity-bots'],
    queryFn: () =>
      request<{
        items: {
          kind: string
          title: string
          execution: string
          outcome: string
          updated_at: string
          active_count: number
        }[]
      }>('/v1/activity/bots'),
    refetchInterval: 30_000,
  })
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const actions = useQuery({
    queryKey: ['activity', tab, offset],
    queryFn: () => getActions(offset, tab === 'attention'),
    enabled: tab === 'submissions' || tab === 'attention',
    // Paging keeps the current page up while the next loads; switching tab starts clean.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === tab ? previous : undefined,
    refetchInterval: (q) =>
      q.state.data?.items.some((a) => ['queued', 'delivered', 'running'].includes(a.execution))
        ? 5000
        : 30_000,
  })
  const sessions = useQuery({
    queryKey: ['sessions', offset],
    queryFn: () => getSessions(offset),
    enabled: tab === 'sessions',
    placeholderData: keepPreviousData,
    refetchInterval: 5000,
  })
  const query = tab === 'sessions' ? sessions : actions
  const visibleActions = actions.data?.items.filter((a) => tab !== 'attention' || !isHeldAction(a))
  return (
    <div className="dashboard">
      <Stack>
        <PageHeader
          title="Activity"
          subtitle="Follow background work from request to verified result."
          actions={
            <Button variant="default" onClick={() => void query.refetch()}>
              Refresh
            </Button>
          }
        />
        {bots.data && bots.data.items.length > 0 && (
          <details>
            <summary>Background bots · {bots.data.items.length} reporting</summary>
            <Group mt="sm" align="stretch">
              {bots.data.items.map((bot) => (
                <div className="activity-item" key={bot.kind}>
                  <Text fw={600}>{label(bot.kind)}</Text>
                  <Text size="sm">
                    {bot.active_count
                      ? `${bot.active_count} active`
                      : `Last run: ${label(bot.execution)}`}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {stamp(bot.updated_at)}
                  </Text>
                </div>
              ))}
            </Group>
          </details>
        )}
        <SegmentedControl
          value={tab}
          onChange={(v) => {
            setOffset(0)
            setParams({ tab: v })
          }}
          data={[
            { value: 'submissions', label: 'Submissions' },
            { value: 'sessions', label: 'LLM sessions' },
            { value: 'attention', label: 'Needs attention' },
            { value: 'runs', label: 'Runs' },
          ]}
        />
        {tab === 'runs' ? (
          <RunsPanel />
        ) : (
          <>
        <TextInput
          label="Search this page"
          placeholder="Player, bot or task"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
        {query.isPending && (
          <CardListSkeleton
            label="Loading activity"
            cardClassName="activity-item"
            count={6}
            lineHeight={18}
          />
        )}
        {query.error && <Alert color="red">Could not load activity: {query.error.message}</Alert>}
        {(tab === 'sessions' ? sessions.data?.items.length === 0 : visibleActions?.length === 0) && (
          <Text c="dimmed">
            No {tab === 'attention' ? 'items need attention on this page' : 'activity recorded yet'}.
          </Text>
        )}
        {tab === 'sessions'
          ? sessions.data?.items
              .filter((a) => a.title.toLowerCase().includes(search.toLowerCase()))
              .map((a) => (
                <Link className="activity-item" key={a.id} to={`/activity/sessions/${a.id}`}>
                  <Group justify="space-between">
                    <Text fw={600}>{a.title}</Text>
                    <Badge>{label(a.status)}</Badge>
                  </Group>
                  <Text c="dimmed" size="xs">
                    {stamp(a.updated_at)}
                  </Text>
                </Link>
              ))
          : visibleActions
              ?.filter((a) => `${a.title} ${a.kind}`.toLowerCase().includes(search.toLowerCase()))
              .map((a) => (
                <Link className="activity-item" key={a.id} to={`/activity/actions/${a.id}`}>
                  <Group justify="space-between">
                    <Text fw={600}>{a.title}</Text>
                    <Group gap="xs">
                      {a.unread && <Badge variant="dot">New</Badge>}
                      <DependencyBadge action={a} />
                      <Badge>{label(a.execution)}</Badge>
                      <Badge
                        variant="outline"
                        color={
                          a.outcome === 'verified_complete'
                            ? 'teal'
                            : a.outcome === 'unknown'
                              ? 'yellow'
                              : 'blue'
                        }
                      >
                        {label(a.outcome)}
                      </Badge>
                    </Group>
                  </Group>
                  <Text c="dimmed" size="xs">
                    {stamp(a.updated_at)} · {a.attempts} attempt(s)
                  </Text>
                </Link>
              ))}
        <Pager
          previousDisabled={!offset}
          nextDisabled={(query.data?.items.length ?? 0) < 50}
          onPrevious={() => setOffset(Math.max(0, offset - 50))}
          onNext={() => setOffset(offset + 50)}
        />
          </>
        )}
      </Stack>
    </div>
  )
}
export function ActionDetailPage() {
  const { id = '' } = useParams()
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState<string | null>(null)
  const query = useQuery({
    queryKey: ['action', id],
    queryFn: () => getAction(id),
    refetchInterval: (q) =>
      ['verified_complete', 'rejected', 'cancelled', 'expired'].includes(
        q.state.data?.outcome ?? '',
      ) || q.state.data?.execution === 'skipped'
        ? false
        : 5000,
  })
  const action = query.data
  const dependency = action && actionDependency(action)
  async function markRead() {
    setCheckError(null)
    try {
      await markActivityRead(id)
      await queryClient.invalidateQueries({
        predicate: (q) => ['activity', 'activity-indicator'].includes(String(q.queryKey[0])),
      })
    } catch (e) {
      setCheckError(`Could not mark read: ${String(e)}`)
    }
  }
  async function check() {
    setChecking(true)
    setCheckError(null)
    try {
      const result = await checkAction(id)
      if (result.outcome === 'verified_complete') await invalidateRoster()
      await query.refetch()
    } catch (e) {
      setCheckError(String(e))
    } finally {
      setChecking(false)
    }
  }
  return (
    <div className="dashboard">
      <Stack>
        <Button component={Link} to="/activity" variant="subtle">
          ← All activity
        </Button>
        {query.error && <Alert color="red">{query.error.message}</Alert>}
        {!action && !query.error && <ActivityDetailSkeleton label="Loading submission" />}
        {action && (
          <>
            <h2>{action.title}</h2>
            <Group>
              <Badge>{label(action.execution)}</Badge>
              <Badge>{label(action.outcome)}</Badge>
              <Text size="sm">Last updated {stamp(action.updated_at)}</Text>
            </Group>
            <Text size="sm" c="dimmed">
              {isHeldAction(action)
                ? 'This claim is held and has not been sent to ESPN. It is waiting for its IR move.'
                : 'Submission to ESPN and final completion are tracked separately. Unknown means verification is still needed.'}
            </Text>
            {dependency && (
              <Alert color={dependency.color} title={dependency.label}>
                <Text size="sm">{dependency.description}</Text>
                {dependency.reason && <Text size="sm">{dependency.reason}</Text>}
                {dependency.parentId && (
                  <Link to={`/activity/actions/${encodeURIComponent(dependency.parentId)}`}>View IR move</Link>
                )}
              </Alert>
            )}
            <Group>
              <Button loading={checking} onClick={() => void check()}>
                Check status
              </Button>
              <Button variant="default" onClick={() => void markRead()}>
                Mark read
              </Button>
              <Button
                component="a"
                href="https://fantasy.espn.com/football/"
                target="_blank"
                rel="noreferrer"
                variant="subtle"
              >
                Open ESPN
              </Button>
            </Group>
            {checkError && <Alert color="red">{checkError}</Alert>}
            <h3>Progress</h3>
            {action.events?.map((e) => {
              const eventDependency = dependencyEvent(e)
              return (
              <div className="timeline-event" key={e.id}>
                <Text fw={600}>{eventDependency?.label ?? label(e.stage)}</Text>
                <Text size="xs" c="dimmed">
                  {stamp(e.created_at)}
                </Text>
                {eventDependency ? (
                  <>
                    <Text size="sm">{eventDependency.description}</Text>
                    {eventDependency.reason && <Text size="sm">{eventDependency.reason}</Text>}
                    {eventDependency.parentId && (
                      <Link to={`/activity/actions/${encodeURIComponent(eventDependency.parentId)}`}>View IR move</Link>
                    )}
                  </>
                ) : Object.keys(e.detail).length > 0 && <Payload value={e.detail} />}
              </div>
              )
            })}
            <details>
              <summary>Submission details</summary>
              <Payload value={action.payload} />
            </details>
            <details>
              <summary>Latest verification evidence</summary>
              <Payload value={action.evidence} />
            </details>
            <Button component={Link} to={`/activity/trace/activity_action/${encodeURIComponent(action.id)}`} variant="subtle">
              Trace what triggered this
            </Button>
            {action.sessions?.map((s) => (
              <Button key={s.id} component={Link} to={`/activity/sessions/${s.id}`} variant="light">
                LLM session: {s.title}
              </Button>
            ))}
          </>
        )}
      </Stack>
    </div>
  )
}
export function SessionDetailPage() {
  const { id = '' } = useParams()
  const query = useQuery({
    queryKey: ['session', id],
    queryFn: () => getSession(id),
    refetchInterval: (q) => (q.state.data?.status === 'running' ? 5000 : false),
  })
  const session = query.data
  return (
    <div className="dashboard">
      <Stack>
        <Button component={Link} to="/activity?tab=sessions" variant="subtle">
          ← LLM sessions
        </Button>
        {query.error && <Alert color="red">{query.error.message}</Alert>}
        {!session && !query.error && <ActivityDetailSkeleton label="Loading session" />}
        {session && (
          <>
            <h2>{session.title}</h2>
            <Badge>{label(session.status)}</Badge>
            <Text size="sm" c="dimmed">
              Application messages, supplied context and observable results. Credentials are
              redacted.
            </Text>
            {session.content?.map((message, i) => (
              <section className="timeline-event" key={i}>
                <Text fw={600}>{label(message.role)}</Text>
                <Payload value={message.content} />
              </section>
            ))}
            <Button component={Link} to={`/chat?session=${id}`}>
              Ask a follow-up
            </Button>
            {session.action_id && (
              <Button
                component={Link}
                to={`/activity/actions/${session.action_id}`}
                variant="light"
              >
                View resulting submission
              </Button>
            )}
          </>
        )}
      </Stack>
    </div>
  )
}
