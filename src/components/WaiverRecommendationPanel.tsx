import { Badge, Button, Group, Skeleton, Stack, Text } from '@mantine/core'
import { MoveSidesSkeleton, SkeletonRegion } from './skeletons'
import { Link } from 'react-router-dom'
import { InjuryBadge } from './InjuryBadge'
import { useSelectedWeek } from '../hooks/useSelectedWeek'
import type { DraftConfig, WaiverIrMove, WaiverRecommendation } from '../api/types'
interface Props {
  recommendations: WaiverRecommendation[]
  config: DraftConfig
  openIrSlots?: number
  irMoves?: WaiverIrMove[]
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

export function WaiverRecommendationPanel({ recommendations, openIrSlots = 0, irMoves = [], loading = false, updating = false }: Props) {
  const [week] = useSelectedWeek()
  return (
    <section className="waiver-recommendation-panel">
      <h3>Waiver upgrades</h3>
      <Text size="sm" c="dimmed" mb="md">
        Compare roster changes before submitting a claim. IR suggestions must be completed in ESPN.
      </Text>
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
            const outgoingPlayer = isIrAndAdd ? r.ir_player : r.bench_player
            const params = new URLSearchParams({
              kind: 'waiver',
              week: String(week),
              add: r.free_agent.espn_id ?? '',
              drop: r.bench_player?.espn_id ?? '',
            })
            const canReview = !isIrAndAdd && (r.kind === undefined || r.kind === 'swap') && Boolean(r.free_agent.espn_id && r.bench_player?.espn_id)
            return (
              <li
                className="waiver-recommendation-row"
                key={`${r.position}-${r.free_agent.espn_id ?? r.free_agent.name}`}
              >
                <div className="move-sides">
                  <div className="move-side incoming">
                    <h3>Add to your roster</h3>
                    <Text fw={700}>{r.free_agent.name}</Text>
                    <Text size="sm">
                      {r.position} · {r.free_agent.pro_team}
                    </Text>
                    <InjuryBadge status={r.free_agent.injury_status} />
                  </div>
                  <div className={`move-side ${isIrAndAdd ? 'ir' : 'outgoing'}`}>
                    <h3>{isIrAndAdd ? 'Move to IR' : 'Drop from your roster'}</h3>
                    <Text fw={700}>{outgoingPlayer?.name ?? '—'}</Text>
                    <Text size="sm">
                      {isIrAndAdd ? 'IR stash' : r.position} · {outgoingPlayer?.pro_team ?? '—'}
                    </Text>
                    <InjuryBadge status={outgoingPlayer?.injury_status ?? null} />
                  </div>
                </div>
                {isIrAndAdd && <Text size="sm" mt="sm">Nobody is dropped.</Text>}
                <Group justify="space-between" mt="md">
                  <Stack gap={2}>
                    <Badge color="teal">
                      Value over replacement {r.vorp_delta >= 0 ? '+' : ''}
                      {r.vorp_delta.toFixed(1)}
                    </Badge>
                    <Text size="xs" c="dimmed">
                      VORP compares player value; it is not your projected lineup score gain.
                    </Text>
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
