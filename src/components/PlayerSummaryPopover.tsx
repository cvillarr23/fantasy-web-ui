import { useQuery } from '@tanstack/react-query'
import { queryClient } from '../api/queryClient'
import { Modal, Skeleton } from '@mantine/core'
import { getPlayerSummary } from '../api/client'
import { SkeletonRegion, TextSkeleton } from './skeletons'

interface Props {
  playerId: string
  onClose: () => void
}

// Click-to-expand detail panel: fetches the fuller player summary (name/position/team/
// injury_status + recent CORE-13 news) on demand, rather than bundling it into every
// pick-feed row up front.
export function PlayerSummaryPopover({ playerId, onClose }: Props) {
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
          <h4>Recent news</h4>
          <TextSkeleton lines={4} />
        </SkeletonRegion>
      )}
      {summary && (
        <>
          <p className="subtitle">{summary.position} · {summary.team} · {summary.status}
            {summary.injury_status ? ` · ${summary.injury_status}` : ''}</p>
          <h4>Recent news</h4>
          {summary.recent_news.length === 0 && <p className="muted">No recent news.</p>}
          <ul className="news-list">
            {summary.recent_news.map((item, i) => (
              <li key={i}>
                <span className="news-source">{item.source}</span>
                <p>{item.raw_text}</p>
                {item.url && <a href={item.url} target="_blank" rel="noreferrer">source</a>}
              </li>
            ))}
          </ul>
        </>
      )}
    </Modal>
  )
}
