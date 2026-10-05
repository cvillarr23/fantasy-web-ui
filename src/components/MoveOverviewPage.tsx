import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { previewMove } from '../api/dashboard'
import { triggerWaiverClaim } from '../api/client'
import { useDraftConfig } from '../hooks/useDraftConfig'
import { useSelectedWeek } from '../hooks/useSelectedWeek'
import { WeekSelector } from './WeekSelector'
import { palette } from '../theme'
export function MoveOverviewPage() {
  const { config } = useDraftConfig()
  const [params, setParams] = useSearchParams()
  const [week, setWeek] = useSelectedWeek()
  const kind = params.get('kind') === 'trade' ? 'trade' : 'waiver'
  const incoming = params.getAll('add')
  const outgoing = params.getAll('drop')
  const [rest, setRest] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
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
  const query = useQuery({
    queryKey: ['move-preview', config.league_id, config.team_id, payload],
    queryFn: () => previewMove(payload),
    enabled: Boolean(week && incoming.length),
    staleTime: 30_000,
  })
  const submissionKey = useMemo(
    () => crypto.randomUUID(),
    [config.league_id, config.team_id, params.toString()],
  )
  const data = query.data
  async function submit() {
    if (!data) return
    setBusy(true)
    setError(null)
    try {
      // Refresh the proposal immediately before the final action; the worker independently validates current eligibility.
      const fresh = await previewMove(payload)
      const add = fresh.incoming[0]
      const drop = fresh.outgoing[0]
      if (!add || !drop) throw new Error('Select both a player to add and a player to drop.')
      const result = await triggerWaiverClaim(
        config,
        { ...add, net_vorp: add.net_vorp ?? 0 },
        { ...drop, net_vorp: drop.net_vorp ?? 0 },
        submissionKey,
      )
      setTracking(result.tracking_id)
      setConfirm(false)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="dashboard">
      <Stack>
        <Group justify="space-between">
          <div>
            <h2>{kind === 'waiver' ? 'Review waiver move' : 'Review trade'}</h2>
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
        {!incoming.length && (
          <Alert color="yellow">Choose a move from Waivers or the trade builder first.</Alert>
        )}
        {query.isPending && incoming.length > 0 && (
          <Text role="status">Comparing eligible lineups…</Text>
        )}
        {query.error && (
          <Alert color="red">
            {query.error.message}
            <Button variant="subtle" onClick={() => void query.refetch()}>
              Retry
            </Button>
          </Alert>
        )}
        {data && (
          <>
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
                label="Player to drop"
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
                      <Table.Td>{w.before?.toFixed(1) ?? '—'}</Table.Td>
                      <Table.Td>{w.after?.toFixed(1) ?? '—'}</Table.Td>
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
            {kind === 'waiver' && !tracking && (
              <Button onClick={() => setConfirm(true)} disabled={!data.outgoing.length}>
                Review and submit ESPN claim
              </Button>
            )}
            {kind === 'trade' && (
              <Alert color="blue">This is an evaluation. No trade has been submitted.</Alert>
            )}
            {tracking && (
              <Alert color="teal">
                Claim queued.{' '}
                <Link to={`/activity/actions/${tracking}`}>
                  Track this submission and final outcome
                </Link>
              </Alert>
            )}
            <Text size="xs" c="dimmed">
              Evaluated {new Date(data.updated_at).toLocaleString()}
            </Text>
          </>
        )}
        {error && <Alert color="red">{error}</Alert>}
        <Modal
          opened={confirm}
          onClose={() => !busy && setConfirm(false)}
          title="Confirm live waiver claim"
        >
          <Stack>
            <Text>
              Add <strong>{data?.incoming[0]?.name}</strong> and drop{' '}
              <strong>{data?.outgoing[0]?.name}</strong>. This submits a real ESPN claim against
              your current roster.
            </Text>
            <Button loading={busy} onClick={() => void submit()}>
              Confirm claim
            </Button>
          </Stack>
        </Modal>
      </Stack>
    </div>
  )
}
