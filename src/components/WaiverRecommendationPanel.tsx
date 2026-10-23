import { Badge, Button, Group, Skeleton, Stack, Text } from '@mantine/core'
import { MoveSidesSkeleton, SkeletonRegion } from './skeletons'
import { Link } from 'react-router-dom'
import { ByeBadge } from './player/ByeBadge'
import { InjuryBadge } from './player/InjuryBadge'
import { useSelectedWeek } from '../hooks/useSelectedWeek'
import type { DraftConfig, WaiverIrMove, WaiverRecommendation } from '../api/types'
interface Props {
  recommendations: WaiverRecommendation[]
  config: DraftConfig
  openIrSlots?: number
  openRosterSlots?: number
  irMoves?: WaiverIrMove[]
  /** Weeks each VORP value averages over; one week means a single-week valuation. */
  horizonWeeks?: number[] | null
  /** Weeks where NFL byes leave our lineup short. */
  byeCrunchWeeks?: number[]
  /** First load: render placeholder rows inside the real panel chrome. */
  loading?: boolean
  /** Showing the previous week's recommendations while the next week loads. */
  updating?: boolean
}

function RecommendationRowsSkeleton() {
  return (
    <SkeletonRegion label="Finding waiver upgrades">
      <ul className="waiver-recommendation-list">
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i} className="waiver-recommendation-row">
            <MoveSidesSkeleton />
            <Group justify="space-between" mt="md">
              <Stack gap={4}>
                <Skeleton height={20} width={190} radius="xl" />
                <Skeleton height={10} width={260} />
              </Stack>
              <Skeleton height={36} width={120} radius="sm" />
            </Group>
          </li>
        ))}
      </ul>
    </SkeletonRegion>
  )
}

function signed(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}`
}

function weekRange(weeks: number[]) {
  return weeks.length > 1 ? `Wk ${weeks[0]}–${weeks[weeks.length - 1]}` : `Wk ${weeks[0]}`
}

export function WaiverRecommendationPanel({ recommendations, openIrSlots = 0, openRosterSlots = 0, irMoves = [], horizonWeeks = null, byeCrunchWeeks = [], loading = false, updating = false }: Props) {
  const [week] = useSelectedWeek()
  const viewedWeek = Number(week) || null
  const horizon = horizonWeeks && horizonWeeks.length > 1 ? horizonWeeks : null
  return (
    <section className="waiver-recommendation-panel">
      <h3>Waiver upgrades</h3>
      <Text size="sm" c="dimmed" mb="md">
        Compare roster changes before submitting a claim. IR suggestions must be completed in ESPN.
      </Text>
      {!loading && byeCrunchWeeks.length > 0 && (
        <Text size="sm" mb="md">
          NFL byes leave your lineup short in {byeCrunchWeeks.map((w) => `week ${w}`).join(', ')}. Fill-ins for those weeks are marked below.
        </Text>
      )}
      {!loading && openRosterSlots > 0 && (
        <Text size="sm" mb="md">{openRosterSlots} open roster {openRosterSlots === 1 ? 'slot' : 'slots'}</Text>
      )}
      {!loading && openIrSlots > 0 && (
        <Text size="sm" mb="md">{openIrSlots} open IR {openIrSlots === 1 ? 'slot' : 'slots'}</Text>
      )}
      {!loading && irMoves.length > 0 && (
        <section aria-label="Suggested IR moves" aria-busy={updating || undefined}>
          <h3>Suggested IR moves</h3>
          <Text size="sm" c="dimmed">Make IR moves directly in ESPN. These suggestions are display only.</Text>
          <ul className="waiver-recommendation-list">
            {irMoves.map((move) => (
              <li className="waiver-recommendation-row" key={move.player.espn_id ?? move.player.name}>
                <Badge color="yellow">Move to IR</Badge>
                <Text fw={700}>{move.player.name}</Text>
                <Text size="sm">{move.position} · {move.player.pro_team}</Text>
                <InjuryBadge status={move.player.injury_status} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {loading ? (
        <RecommendationRowsSkeleton />
      ) : !recommendations.length ? (
        <Text c="dimmed" size="sm">
          No waiver upgrades this week.
        </Text>
      ) : (
        <ul className="waiver-recommendation-list" aria-busy={updating || undefined}>
          {recommendations.map((r) => {
            const isIrAndAdd = r.kind === 'ir_and_add'
            const isAddOnly = r.kind === 'add'
            const outgoingPlayer = isIrAndAdd ? r.ir_player : r.bench_player
            const params = new URLSearchParams({
              kind: 'waiver',
              week: String(week),
              add: r.free_agent.espn_id ?? '',
            })
            // No drop param: the review page submits an add-only claim into the open slot.
            if (!isAddOnly) params.set('drop', r.bench_player?.espn_id ?? '')
            const canReview = isAddOnly
              ? Boolean(r.free_agent.espn_id)
              : (r.kind === undefined || r.kind === 'swap') && Boolean(r.free_agent.espn_id && r.bench_player?.espn_id)
            return (
              <li
                className="waiver-recommendation-row"
                key={`${r.position}-${r.free_agent.espn_id ?? r.free_agent.name}`}
              >
                <div className={isAddOnly ? 'move-sides single' : 'move-sides'}>
                  <div className="move-side incoming">
                    <h3>Add to your roster</h3>
                    <Text fw={700}>{r.free_agent.name}</Text>
                    <Text size="sm">
                      {r.position} · {r.free_agent.pro_team}
                    </Text>
                    <ByeBadge byeWeek={r.free_agent.bye_week} week={viewedWeek} />
                    <InjuryBadge status={r.free_agent.injury_status} />
                  </div>
                  {!isAddOnly && <div className={`move-side ${isIrAndAdd ? 'ir' : 'outgoing'}`}>
                    <h3>{isIrAndAdd ? 'Move to IR' : 'Drop from your roster'}</h3>
                    <Text fw={700}>{outgoingPlayer?.name ?? '—'}</Text>
                    <Text size="sm">
                      {isIrAndAdd
                        ? 'IR stash'
                        : outgoingPlayer?.position
                          ? `${outgoingPlayer.position} · ${outgoingPlayer.pro_team}`
                          : outgoingPlayer?.pro_team ?? '—'}
                    </Text>
                    <ByeBadge byeWeek={outgoingPlayer?.bye_week} week={viewedWeek} />
                    <InjuryBadge status={outgoingPlayer?.injury_status ?? null} />
                  </div>}
                </div>
                {r.bye_fill && (
                  <Group gap="xs" mt="sm">
                    <Badge color="orange">Covers Wk {r.bye_fill.week} bye</Badge>
                    <Text size="sm">
                      A fill-in for week {r.bye_fill.week}, when byes leave your lineup short ({signed(r.bye_fill.lineup_gain)} that week).
                    </Text>
                  </Group>
                )}
                {isIrAndAdd && <Text size="sm" mt="sm">Nobody is dropped.</Text>}
                {isAddOnly && <Text size="sm" mt="sm">Nobody is dropped. This fills an open roster slot.</Text>}
                <Group justify="space-between" mt="md">
                  <Stack gap={2}>
                    <Badge color="teal">
                      Value over replacement {signed(r.vorp_delta)}
                      {horizon && ` per week, ${weekRange(horizon)}`}
                    </Badge>
                    <Text size="xs" c="dimmed">
                      {horizon
                        ? 'VORP is averaged over these weeks, with a bye week counted as replacement level, so a bye never sinks a player.'
                        : 'VORP compares player value; it is not your projected lineup score gain.'}
                    </Text>
                    {r.horizon_lineup_gain != null && r.weekly_lineup_gains && (
                      <Text size="xs" c="dimmed">
                        Starting lineup {signed(r.horizon_lineup_gain)}:{' '}
                        {r.weekly_lineup_gains
                          .map((g) => `Wk ${g.week} ${g.delta == null ? 'unknown' : signed(g.delta)}`)
                          .join(' · ')}
                      </Text>
                    )}
                  </Stack>
                  {canReview && <Button
                    component={Link}
                    to={`/moves/review?${params}`}
                  >
                    Review move
                  </Button>}
                </Group>
                {!canReview && (
                  <Text size="xs" c="dimmed">
                    {isIrAndAdd
                      ? 'Make this IR move and add in ESPN. These suggestions are display only.'
                      : 'An ESPN player identity is missing. Review this move in ESPN.'}
                  </Text>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
