import { useEffect, useState, useSyncExternalStore } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Badge, Button, Card, Checkbox, Group, SimpleGrid, Stack, Text } from '@mantine/core'
import { Link } from 'react-router-dom'
import { getCurrentWeek, getTeamNames } from '../../api/client'
import { getIncomingTrades } from '../../api/tradeInbox'
import { queryClient } from '../../api/queryClient'
import { useDraftConfig } from '../../hooks/useDraftConfig'
import { PageSkeleton } from '../skeletons'
import { IncomingTradeScoreSummary } from './IncomingTradeScoreSummary'
import { IncomingTradeActions } from './IncomingTradeActions'
import { RetryResponseButton } from './RetryResponseButton'
import { IncomingTradeTriage } from './IncomingTradeTriage'
import {
  inboxScope,
  outcomeCopy,
  reviewSignature,
  subscribeAttempts,
  snapshotAttempts,
} from './inboxState'
import type { InboxAttempt } from './inboxState'
function expiryCopy(date: string | null, now: number) {
  const expires = Date.parse(date ?? '')
  if (!Number.isFinite(expires)) return 'Expiry unavailable'
  const left = expires - now
  if (left <= 0) return 'Expired by clock — awaiting worker refresh'
  return `Expires in ${Math.floor(left / 3600000)}h ${Math.floor((left % 3600000) / 60000)}m (${new Date(expires).toLocaleString()})`
}
export function TradeInboxPage() {
  const { config, loading } = useDraftConfig()
  const [hidden, setHidden] = useState(false)
  const [history, setHistory] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const scope = inboxScope(config)
  const attempts = JSON.parse(
    useSyncExternalStore(subscribeAttempts, () => snapshotAttempts(scope)),
  ) as [string, InboxAttempt][]
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const configured = Boolean(config.league_id && config.team_id)
  const query = useQuery(
    {
      queryKey: ['trade-inbox', scope, hidden, history],
      queryFn: () =>
        getIncomingTrades(config, history ? 'all' : 'live', hidden ? 'all' : 'visible'),
      enabled: configured,
      staleTime: 0,
      retry: false,
      refetchInterval: attempts.length ? 10000 : 60000,
      refetchIntervalInBackground: false,
    },
    queryClient,
  )
  const week = useQuery(
    {
      queryKey: ['inbox-week', scope],
      queryFn: () => getCurrentWeek(config.season),
      enabled: configured,
      staleTime: 0,
      retry: false,
    },
    queryClient,
  )
  const names = useQuery(
    {
      queryKey: ['trade-team-names', config.league_id],
      queryFn: () => getTeamNames(config.league_id),
      enabled: configured,
      staleTime: 900000,
    },
    queryClient,
  )
  const outcomes = useQuery(
    {
      queryKey: ['inbox-outcomes', scope],
      queryFn: () => getIncomingTrades(config, 'all', 'all'),
      enabled: configured && attempts.length > 0,
      staleTime: 0,
      retry: false,
      refetchInterval: 10000,
      refetchIntervalInBackground: false,
    },
    queryClient,
  )
  const refresh = () => {
    void query.refetch()
    void week.refetch()
    if (attempts.length) void outcomes.refetch()
  }
  if (!configured)
    return loading ? (
      <PageSkeleton />
    ) : (
      <Stack className="dashboard">
        <Text>Configure your league and team to view incoming offers.</Text>
        <Button component={Link} to="/settings">
          Go to Settings
        </Button>
      </Stack>
    )
  const rows = query.data ?? []
  return (
    <div className="dashboard">
      <Stack gap="md">
        <Group justify="space-between">
          <h2>Inbox</h2>
          <Button variant="default" loading={query.isFetching} onClick={refresh}>
            Refresh inbox
          </Button>
        </Group>
        <Alert color="yellow">
          Responses are disabled in the supplied production configuration (TRADE_RESPONSE_ENABLED is
          off). Decisions are queued requests; ESPN acceptance or decline requires a confirmed
          worker outcome.
        </Alert>
        <Text size="sm">
          Scheduled inbox refresh: every two hours from 08:00 to 22:00 Central. Refresh inbox reads
          stored offers; it does not trigger an ESPN refresh. Last refreshed below is per-offer
          evidence, not a global job heartbeat.
        </Text>
        <Group>
          <Checkbox
            label="Show snoozed and dismissed"
            checked={hidden}
            onChange={(e) => setHidden(e.currentTarget.checked)}
          />
          <Checkbox
            label="Include history"
            checked={history}
            onChange={(e) => setHistory(e.currentTarget.checked)}
          />
          <Button component={Link} to="/trades" variant="subtle">
            View outgoing proposals
          </Button>
        </Group>
        {query.isPending && <PageSkeleton label="Loading incoming offers" />}
        {query.isError && (
          <Alert color="red">
            Could not load inbox: {query.error.message}. Previously loaded offers may be out of
            date. Response actions are disabled.
          </Alert>
        )}
        {week.isError && (
          <Alert color="yellow">Current week unavailable. Accept and counter are disabled.</Alert>
        )}
        {!query.isPending && !query.isError && rows.length === 0 && (
          <Text>No incoming offers in this view.</Text>
        )}
        {attempts.map(([id, attempt]) => {
          const copies = outcomes.data?.filter((r) => r.espn_transaction_id === id) ?? []
          const observed = copies.length === 1 ? copies[0] : undefined
          const copy = observed ? outcomeCopy(observed) : null
          const terminal = observed && observed.status !== 'open' && observed.status !== 'unparsed'
          if (rows.some((r) => r.espn_transaction_id === id) && !terminal) return null
          return (
            <Alert key={id} color="blue">
              <Text fw={600}>Offer {id}</Text>
              <Text>{copy && copy !== 'Open' ? copy : attempt.message}</Text>
              {outcomes.isError && (
                <Text>
                  Current outcome could not be verified. Previously recorded evidence may be out of
                  date.
                </Text>
              )}
              {!observed && (
                <Text>
                  No unique matching status record was returned. Absence does not confirm an ESPN
                  outcome.
                </Text>
              )}
              {attempt.response && (
                <Text size="xs">Queue tracking ID: {attempt.response.tracking_id}</Text>
              )}
              <Button component={Link} to="/activity?tab=attention" variant="subtle">
                Verify in Activity
              </Button>
            </Alert>
          )
        })}
        {rows.map((row) => (
          <Card key={row.id} withBorder radius="md" component="article">
            <Stack gap="sm">
              <Group justify="space-between">
                <Text fw={600}>
                  {names.data?.[row.proposing_team_id ?? ''] ??
                    `Team ${row.proposing_team_id ?? 'unknown'}`}{' '}
                  · Offer {row.espn_transaction_id}
                </Text>
                <Group gap="xs">
                  <Badge variant="light">{row.status}</Badge>
                  <Badge variant="light">{row.triage?.state ?? 'new'}</Badge>
                </Group>
              </Group>
              <Text>{outcomeCopy(row)}</Text>
              {(row.decision?.outcome === 'unknown' ||
                row.status === 'closed_unknown' ||
                row.status === 'responding') && (
                <Button component={Link} to="/activity?tab=attention" variant="subtle">
                  Verify in Activity
                </Button>
              )}
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                {(['receive', 'send'] as const).map((side) => (
                  <div key={side}>
                    <Text fw={600}>You {side}</Text>
                    <ul>
                      {row[`${side}_players`].map((p) => (
                        <li key={p.espn_id}>{p.name ?? `ESPN player ${p.espn_id}`}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </SimpleGrid>
              <Text fw={600}>Manager’s note</Text>
              <Text
                data-testid="incoming-note"
                style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
              >
                {row.comment ?? 'No note provided.'}
              </Text>
              <Text size="sm">{expiryCopy(row.expiration_date, now)}</Text>
              <Text size="xs">
                Last refreshed:{' '}
                {row.last_seen_at ? new Date(row.last_seen_at).toLocaleString() : 'Unavailable'}
                {row.triage?.snooze_until
                  ? ` · Snoozed until ${new Date(row.triage.snooze_until).toLocaleString()}`
                  : ''}
              </Text>
              {row.parse_issues.length > 0 && (
                <Alert color="yellow">Parse issues: {row.parse_issues.join('; ')}</Alert>
              )}
              <IncomingTradeScoreSummary row={row} />
              {row.publications.map((p) => (
                <Text key={p.tracking_id} size="sm">
                  {p.status === 'queued'
                    ? p.kind === 'counter'
                      ? 'Negotiation queued — no ESPN counter confirmed.'
                      : 'Decision queued — ESPN outcome unconfirmed.'
                    : p.status === 'pending'
                      ? 'Publication pending or outcome unknown — do not repeat.'
                      : 'Failed before publication — explicit review required to retry.'}{' '}
                  Tracking ID: {p.tracking_id} · {p.approved_by} · {p.approved_at}
                </Text>
              ))}
              <RetryResponseButton
                key={`retry:${scope}:${row.response?.id ?? 'none'}`}
                offer={row}
                onQueued={refresh}
              />
              <IncomingTradeTriage
                key={`triage:${scope}:${row.espn_transaction_id}`}
                row={row}
                disabled={
                  query.isError ||
                  query.isFetching ||
                  rows.filter((r) => r.espn_transaction_id === row.espn_transaction_id).length !== 1
                }
                refresh={refresh}
              />
              <IncomingTradeActions
                key={`${scope}:${reviewSignature(row)}`}
                row={row}
                config={config}
                week={!week.isError ? week.data?.week : undefined}
                disabled={
                  query.isError ||
                  query.isFetching ||
                  rows.filter((r) => r.espn_transaction_id === row.espn_transaction_id).length !== 1
                }
                refresh={refresh}
              />
            </Stack>
          </Card>
        ))}
      </Stack>
    </div>
  )
}
