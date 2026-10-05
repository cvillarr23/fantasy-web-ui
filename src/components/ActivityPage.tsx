import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Badge,
  Button,
  Group,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  checkAction,
  getAction,
  getActions,
  getSession,
  getSessions,
  markActivityRead,
} from '../api/dashboard'
import { request } from '../api/client'
import { queryClient, invalidateRoster } from '../api/queryClient'

const label = (value: string) => value.replaceAll('_', ' ')
const stamp = (value: string) => new Date(value).toLocaleString()
function Payload({ value }: { value: unknown }) {
  return (
    <pre className="payload">
      {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
    </pre>
  )
}
export function ActivityIndicator() {
  const query = useQuery({
    queryKey: ['activity-indicator'],
    queryFn: () => getActions(),
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
    enabled: tab !== 'sessions',
    refetchInterval: (q) =>
      q.state.data?.items.some((a) => ['queued', 'delivered', 'running'].includes(a.execution))
        ? 5000
        : 30_000,
  })
  const sessions = useQuery({
    queryKey: ['sessions', offset],
    queryFn: () => getSessions(offset),
    enabled: tab === 'sessions',
    refetchInterval: 5000,
  })
  const query = tab === 'sessions' ? sessions : actions
  return (
    <div className="dashboard">
      <Stack>
        <Group justify="space-between">
          <div>
            <h2>Activity</h2>
            <Text c="dimmed" size="sm">
              Follow background work from request to verified result.
            </Text>
          </div>
          <Button variant="default" onClick={() => void query.refetch()}>
            Refresh
          </Button>
        </Group>
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
          ]}
        />
        <TextInput
          label="Search this page"
          placeholder="Player, bot or task"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
        {query.isPending && <Text role="status">Loading activity…</Text>}
        {query.error && <Alert color="red">Could not load activity: {query.error.message}</Alert>}
        {query.data?.items.length === 0 && (
          <Text c="dimmed">
            No {tab === 'attention' ? 'items need attention' : 'activity recorded yet'}.
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
          : actions.data?.items
              .filter((a) => `${a.title} ${a.kind}`.toLowerCase().includes(search.toLowerCase()))
              .map((a) => (
                <Link className="activity-item" key={a.id} to={`/activity/actions/${a.id}`}>
                  <Group justify="space-between">
                    <Text fw={600}>{a.title}</Text>
                    <Group gap="xs">
                      {a.unread && <Badge variant="dot">New</Badge>}
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
        <Group>
          <Button disabled={!offset} onClick={() => setOffset(Math.max(0, offset - 50))}>
            Previous
          </Button>
          <Button
            disabled={(query.data?.items.length ?? 0) < 50}
            onClick={() => setOffset(offset + 50)}
          >
            Next
          </Button>
        </Group>
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
        {!action && !query.error && <Text>Loading submission…</Text>}
        {action && (
          <>
            <h2>{action.title}</h2>
            <Group>
              <Badge>{label(action.execution)}</Badge>
              <Badge>{label(action.outcome)}</Badge>
              <Text size="sm">Last updated {stamp(action.updated_at)}</Text>
            </Group>
            <Text size="sm" c="dimmed">
              Submission to ESPN and final completion are tracked separately. Unknown means
              verification is still needed.
            </Text>
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
            {action.events?.map((e) => (
              <div className="timeline-event" key={e.id}>
                <Text fw={600}>{label(e.stage)}</Text>
                <Text size="xs" c="dimmed">
                  {stamp(e.created_at)}
                </Text>
                {Object.keys(e.detail).length > 0 && <Payload value={e.detail} />}
              </div>
            ))}
            <details>
              <summary>Submission details</summary>
              <Payload value={action.payload} />
            </details>
            <details>
              <summary>Latest verification evidence</summary>
              <Payload value={action.evidence} />
            </details>
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
