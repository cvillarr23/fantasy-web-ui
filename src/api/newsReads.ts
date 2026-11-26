import { queryOptions } from '@tanstack/react-query'
import { getRecentNews } from './client'

const RECENT_NEWS_STALE_MS = 5 * 60_000

/** Which of the players on a page have news from the last day. Not polled: a badge a few minutes
 * behind costs nothing. */
export function recentNewsQuery(playerIds: string[]) {
  const ids = [...new Set(playerIds)].sort()
  return queryOptions({
    queryKey: ['news-recent', ids],
    queryFn: () => getRecentNews(ids),
    enabled: ids.length > 0,
    staleTime: RECENT_NEWS_STALE_MS,
  })
}
