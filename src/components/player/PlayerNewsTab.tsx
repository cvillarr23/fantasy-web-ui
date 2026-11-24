import { useQuery } from '@tanstack/react-query'
import { Text } from '@mantine/core'
import { getPlayerNews } from '../../api/client'
import { queryClient } from '../../api/queryClient'
import { SkeletonRegion, TextSkeleton } from '../skeletons'
import { NewsItemRow } from './NewsItemRow'

export function PlayerNewsTab({ playerId }: { playerId: string }) {
  const query = useQuery({
    queryKey: ['player-news', playerId],
    queryFn: () => getPlayerNews(playerId),
  }, queryClient)

  if (query.error) return <p className="error">Failed to load news: {String(query.error)}</p>
  if (!query.data) {
    return (
      <SkeletonRegion label="Loading news">
        <TextSkeleton lines={4} />
      </SkeletonRegion>
    )
  }
  if (query.data.length === 0) return <Text c="dimmed" size="sm">No news in the last 7 days.</Text>
  return (
    <ul className="popover-news">
      {query.data.map((item) => <NewsItemRow key={item.id} item={item} />)}
    </ul>
  )
}
