import { useQuery } from '@tanstack/react-query'
import { queryClient } from '../../api/queryClient'
import { Modal, Skeleton, Tabs } from '@mantine/core'
import { getPlayerSummary } from '../../api/client'
import type { PlayerSummary } from '../../api/types'
import { SkeletonRegion, TextSkeleton } from '../skeletons'
import { PlayerNewsTab } from './PlayerNewsTab'
import { PlayerStatsTab } from './PlayerStatsTab'
import { PlayerSummaryTab } from './PlayerSummaryTab'

interface Props {
  playerId: string
  onClose: () => void
  /** The Game details page; the link is hidden when this is not given. */
  onOpenGame?: (eventId: string) => void
  /** The Scoring guide page; the link is hidden when this is not given. */
  onOpenScoringGuide?: () => void
}

// Click-to-expand detail panel: fetches the fuller player summary (name/position/team/
// injury_status) on demand, rather than bundling it into every pick-feed row up front. The
// News tab loads its own feed only once it is opened.
export function PlayerSummaryPopover({ playerId, onClose, onOpenGame, onOpenScoringGuide }: Props) {
  const query = useQuery({
    queryKey: ['player-summary', playerId],
    queryFn: () => getPlayerSummary(playerId),
  }, queryClient)
  const summary = query.data
  const error = query.error ? String(query.error) : null

  return (
    <Modal
      opened
      onClose={onClose}
      title={summary?.name ?? (error ? 'Unable to load player' : 'Player')}
      size="md"
    >
      {error && <p className="error">Failed to load player summary: {error}</p>}
      {!summary && !error && (
        <SkeletonRegion label="Loading player">
          <Skeleton height={14} width="60%" my="md" />
          <TextSkeleton lines={4} />
        </SkeletonRegion>
      )}
      {summary && (
        <PlayerTabs summary={summary} onOpenGame={onOpenGame} onOpenScoringGuide={onOpenScoringGuide} />
      )}
    </Modal>
  )
}

function PlayerTabs({ summary, onOpenGame, onOpenScoringGuide }: Omit<Props, 'playerId' | 'onClose'> & { summary: PlayerSummary }) {
  return (
    <>
      <p className="subtitle">{summary.position} · {summary.team} · {summary.status}</p>
      <Tabs defaultValue="summary" keepMounted={false}>
        <Tabs.List mb="sm">
          <Tabs.Tab value="summary">Summary</Tabs.Tab>
          <Tabs.Tab value="news">News</Tabs.Tab>
          <Tabs.Tab value="stats">Stats</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="summary">
          <PlayerSummaryTab summary={summary} onOpenGame={onOpenGame} />
        </Tabs.Panel>
        <Tabs.Panel value="news">
          <PlayerNewsTab playerId={summary.player_id} />
        </Tabs.Panel>
        <Tabs.Panel value="stats">
          <PlayerStatsTab summary={summary} onOpenScoringGuide={onOpenScoringGuide} />
        </Tabs.Panel>
      </Tabs>
    </>
  )
}
