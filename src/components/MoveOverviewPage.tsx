import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  Select,
  Stack,
  Table,
  Text,
} from '@mantine/core'
import { LineChart } from '@mantine/charts'
import { Link, useSearchParams } from 'react-router-dom'
import { type MovePreview, previewMove } from '../api/dashboard'
import { triggerWaiverClaim } from '../api/client'
import { useDraftConfig } from '../hooks/useDraftConfig'
import { useSelectedWeek } from '../hooks/useSelectedWeek'
import { WeekSelector } from './ui/WeekSelector'
import { palette } from '../theme'
import { ChartSkeleton, MoveSidesSkeleton, OperationProgress, SkeletonRegion } from './skeletons'
import { ErrorAlert } from './ui/ErrorAlert'
import { formatNumber } from './ui/formatNumber'
import { PageHeader } from './ui/PageHeader'
export function MoveOverviewPage() {
  const { config } = useDraftConfig()
  const [params, setParams] = useSearchParams()
  const [week, setWeek] = useSelectedWeek()
  const kind = params.get('kind') === 'trade' ? 'trade' : 'waiver'
  const incoming = params.getAll('add')
  const outgoing = params.getAll('drop')
  const [rest, setRest] = useState(false)
  const [confirmation, setConfirmed] = useState<{ scope: string; move: MovePreview } | null>(null)
  const invalidWaiver = kind === 'waiver' && (incoming.length !== 1 || outgoing.length > 1)
  const [error, setError] = useState<string | null>(null)
  const [tracking, setTracking] = useState<string | null>(null)
  const payload = {
    kind,
    season: config.season,
    start_week: Number(week),
    end_week: rest ? 18 : Math.min(18, Number(week) + 3),
    incoming_espn_ids: incoming,
    outgoing_espn_ids: outgoing,
  }
  const scope = JSON.stringify([config.league_id, config.team_id, payload])
  // Only the exact roster scope and proposal reviewed may be confirmed.
  const confirmed = confirmation?.scope === scope ? confirmation.move : null
  const query = useQuery({
    queryKey: ['move-preview', config.league_id, config.team_id, payload],
    queryFn: () => previewMove(payload),
    enabled: Boolean(week && incoming.length),
    staleTime: 30_000,
    // Toggling the week or rest-of-season keeps the current comparison up (dimmed) while the
    // solver reruns; a different set of players starts clean so stale sides never show.
    placeholderData: (previous, previousQuery) => {
      const prev = previousQuery?.queryKey[3] as typeof payload | undefined
      return prev &&
        prev.incoming_espn_ids.join() === incoming.join() &&
        prev.outgoing_espn_ids.join() === outgoing.join()
        ? previous
        : undefined
    },
  })
  const submissionKey = useMemo(
    () => crypto.randomUUID(),
    [config.league_id, config.team_id, params.toString()],
  )
  const data = query.data
  const [dryRun, setDryRun] = useState(false)
  // Another manager's player can only be acquired by trade; ESPN rejects the claim.
  const rosteredElsewhere = (preview: MovePreview | undefined) =>
    kind === 'waiver'
      ? (preview?.incoming ?? []).filter(
          (p) => p.on_team_id && p.on_team_id !== String(config.team_id),
        )
      : []
  const blocked = rosteredElsewhere(data)
  const tradeParams = new URLSearchParams(params)
  tradeParams.set('kind', 'trade')
  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (invalidWaiver)
        throw new Error('A waiver claim must add one player and drop at most one player.')
      const fresh = await previewMove(payload)
      if (
        fresh.incoming.map((p) => p.espn_id).join() !== incoming.join() ||
        fresh.outgoing.map((p) => p.espn_id).join() !== outgoing.join()
      )
        throw new Error('The proposal changed. Review your selections again.')
      const taken = rosteredElsewhere(fresh)
      if (taken.length)
        throw new Error(
          `${taken.map((p) => p.name).join(', ')} is on another team's roster. Propose a trade instead.`,
        )
      return { scope, move: fresh }
    },
    onMutate: () => setError(null),
    onSuccess: (fresh) => setConfirmed(fresh),
    onError: (e) => setError(String(e)),
  })
  const submitMutation = useMutation({
    mutationFn: (move: MovePreview) => {
      const add = move.incoming[0]
      const drop = move.outgoing[0]
      return triggerWaiverClaim(
        config,
        { ...add, net_vorp: add.net_vorp ?? 0 },
        drop ? { ...drop, net_vorp: drop.net_vorp ?? 0 } : undefined,
        submissionKey,
        dryRun,
      )
    },
    onMutate: () => setError(null),
    onSuccess: (result) => {
      setTracking(result.tracking_id)
      setConfirmed(null)
    },
    onError: (e) => setError(String(e)),
  })
  const busy = reviewMutation.isPending || submitMutation.isPending
  function review() {
    reviewMutation.mutate()
  }
  function submit() {
    if (!confirmed || invalidWaiver) return
    submitMutation.mutate(confirmed)
  }
  return (
    <div className="dashboard">
      <Stack>
        <Group justify="space-between">
          <div>
            <PageHeader title="Move review" level={1} />
            <Text c="dimmed" size="sm">
              Current roster · before and after · fantasy points
            </Text>
          </div>
          <Button
            component={Link}
            to={kind === 'waiver' ? `/waivers?week=${week}` : `/trades?week=${week}`}
            variant="subtle"
          >
            Back to {kind === 'waiver' ? 'waivers' : 'trade builder'}
          </Button>
        </Group>
        <WeekSelector week={week} onChange={setWeek} />
        <Checkbox
          label="Show rest of season"
          checked={rest}
          onChange={(e) => setRest(e.currentTarget.checked)}
        />
        {invalidWaiver && (
          <Alert color="red">Waivers support one addition and at most one drop per claim.</Alert>
        )}
        {!incoming.length && (
          <Alert color="yellow">Choose a move from Waivers or the trade builder first.</Alert>
        )}
        {query.isPending && incoming.length > 0 && Boolean(week) && (
          <SkeletonRegion label="Comparing eligible lineups">
            <Stack>
              <MoveSidesSkeleton />
              <h3>Projected lineup impact</h3>
              <ChartSkeleton height={240} />
            </Stack>
          </SkeletonRegion>
        )}
        {query.isPlaceholderData && <OperationProgress label="Comparing eligible lineups" />}
        {query.error && (
          <ErrorAlert onRetry={() => void query.refetch()}>{query.error.message}</ErrorAlert>
        )}
        {data && (
          <Stack aria-busy={query.isPlaceholderData || undefined}>
            <div className="move-sides">
              {[
                {
                  title: kind === 'waiver' ? 'Add to your roster' : 'You receive',
                  players: data.incoming,
                  side: 'incoming',
                },
                {
                  title: kind === 'waiver' ? 'Drop from your roster' : 'You send',
                  players: data.outgoing,
                  side: 'outgoing',
                },
              ].map((side) => (
                <section className={`move-side ${side.side}`} key={side.side}>
                  <h3>{side.title}</h3>
                  {side.players.map((p) => (
                    <div key={p.espn_id}>
                      <Text fw={700}>{p.name}</Text>
                      <Text size="sm">
                        {p.position} · {p.pro_team}
                      </Text>
                      {p.injury_status && <Badge color="yellow">{p.injury_status}</Badge>}
                    </div>
                  ))}
                </section>
              ))}
            </div>
            {kind === 'waiver' && (
              <Select
                label="Player to drop (optional if you have an open roster spot)"
                clearable
                value={outgoing[0] ?? null}
                data={data.before.map((p) => ({
                  value: p.espn_id,
                  label: `${p.name} · ${p.position} · ${p.slot}`,
                }))}
                onChange={(v) => {
                  setTracking(null)
                  setParams((prev) => {
                    const next = new URLSearchParams(prev)
                    next.delete('drop')
                    if (v) next.append('drop', v)
                    return next
                  })
                }}
              />
            )}
            <h3>Projected lineup impact</h3>
            <Text size="sm" c="dimmed">
              Best eligible starting lineup for each roster. A VORP gain is a separate player-value
              measure, not a predicted score gain. Missing totals mean the comparison has incomplete
              data.
            </Text>
            <LineChart
              h={240}
              data={data.weeks.map((w) => ({ ...w, label: `Week ${w.week}` }))}
              dataKey="label"
              series={[
                { name: 'before', label: 'Before', color: palette.secondary },
                { name: 'after', label: 'After', color: palette.projected },
              ]}
              connectNulls={false}
              withLegend
            />
            <Table.ScrollContainer minWidth={460}>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Week</Table.Th>
                    <Table.Th>Before</Table.Th>
                    <Table.Th>After</Table.Th>
                    <Table.Th>Change</Table.Th>
                    <Table.Th>Source</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.weeks.map((w) => (
                    <Table.Tr key={w.week}>
                      <Table.Td>{w.week}</Table.Td>
                      <Table.Td>{formatNumber(w.before)}</Table.Td>
                      <Table.Td>{formatNumber(w.after)}</Table.Td>
                      <Table.Td>
                        {w.delta == null ? '—' : `${w.delta >= 0 ? '+' : ''}${w.delta.toFixed(1)}`}
                      </Table.Td>
                      <Table.Td>{w.source}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            <h3>Warnings and assumptions</h3>
            {data.warnings.map((warning, i) => (
              <Alert key={i} color="yellow">
                {warning}
              </Alert>
            ))}
            <h3>Position depth</h3>
            <div className="move-sides">
              {[
                { title: 'Your roster before', players: data.before },
                { title: 'Your roster after', players: data.after },
              ].map((side) => (
                <section className="move-side" key={side.title}>
                  <h3>{side.title}</h3>
                  {side.players.map((p) => (
                    <Text key={p.espn_id} size="sm">
                      {p.position} · {p.name}{' '}
                      <Text component="span" c="dimmed" size="xs">
                        {p.slot}
                      </Text>
                    </Text>
                  ))}
                </section>
              ))}
            </div>
            {data.weeks.map((w) => (
              <details key={w.week}>
                <summary>Week {w.week} starting lineups</summary>
                <div className="move-sides">
                  <div>
                    {w.before_lineup.map((p) => (
                      <Text size="sm" key={p.espn_id}>
                        {p.slot} · {p.name}
                      </Text>
                    ))}
                  </div>
                  <div>
                    {w.after_lineup.map((p) => (
                      <Text size="sm" key={p.espn_id}>
                        {p.slot} · {p.name}
                      </Text>
                    ))}
                  </div>
                </div>
              </details>
            ))}
            {blocked.length > 0 && (
              <Alert color="orange" title="Not available on waivers">
                <Stack gap="xs">
                  <Text size="sm">
                    {blocked.map((p) => p.name).join(', ')} is on another team&apos;s roster,
                    so they can&apos;t be claimed. Propose a trade instead.
                  </Text>
                  <Group>
                    <Button
                      component={Link}
                      to={`/moves/review?${tradeParams.toString()}`}
                      variant="light"
                      size="xs"
                    >
                      Evaluate as a trade
                    </Button>
                  </Group>
                </Stack>
              </Alert>
            )}
            {kind === 'waiver' && !tracking && (
              <Button
                onClick={() => void review()}
                loading={busy}
                disabled={invalidWaiver || blocked.length > 0}
              >
                Review and submit ESPN claim
              </Button>
            )}
            {reviewMutation.isPending && (
              <OperationProgress label="Checking the latest roster before you confirm" />
            )}
            {kind === 'trade' && (
              <Alert color="blue">This is an evaluation. No trade has been submitted.</Alert>
            )}
            {tracking && (
              <Alert color="teal">
                {dryRun ? 'Dry run queued. Nothing will be submitted to ESPN.' : 'Claim queued.'}{' '}
                <Link to={`/activity/actions/${tracking}`}>
                  Track this submission and final outcome
                </Link>
              </Alert>
            )}
            <Text size="xs" c="dimmed">
              Evaluated {new Date(data.updated_at).toLocaleString()}
            </Text>
          </Stack>
        )}
        {error && <Alert color="red">{error}</Alert>}
        <Modal
          opened={Boolean(confirmed)}
          onClose={() => !busy && setConfirmed(null)}
          title={dryRun ? 'Confirm waiver dry run' : 'Confirm live waiver claim'}
        >
          <Stack>
            <Text>
              Add <strong>{confirmed?.incoming[0]?.name}</strong>
              {confirmed?.outgoing[0] ? (
                <>
                  {' '}
                  and drop <strong>{confirmed.outgoing[0].name}</strong>
                </>
              ) : (
                ' without dropping a player'
              )}
              .{' '}
              {dryRun
                ? 'The worker checks your roster and logs the claim without submitting it.'
                : 'This submits a real ESPN claim against your current roster.'}
            </Text>
            <Checkbox
              label="Dry run (don't submit to ESPN)"
              checked={dryRun}
              onChange={(e) => setDryRun(e.currentTarget.checked)}
              disabled={busy}
            />
            {confirmed?.warnings.map((warning, i) => (
              <Alert color="yellow" key={i}>
                {warning}
              </Alert>
            ))}
            {error && <Alert color="red">{error}</Alert>}
            <Button loading={busy} onClick={() => void submit()}>
              {dryRun ? 'Run dry run' : 'Confirm claim'}
            </Button>
            {submitMutation.isPending && <OperationProgress label="Submitting claim to ESPN" />}
          </Stack>
        </Modal>
      </Stack>
    </div>
  )
}
