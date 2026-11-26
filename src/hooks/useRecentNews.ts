import { useQuery } from '@tanstack/react-query'
import { recentNewsQuery } from '../api/newsReads'
import { queryClient } from '../api/queryClient'

/** Recent-news flags keyed by core player id. Empty while loading or if the read fails, since the
 * badge is an extra the page works without. */
export function useRecentNews(playerIds: string[]): Record<string, boolean> {
  const query = useQuery(recentNewsQuery(playerIds), queryClient)
  return query.data?.has_news_24h ?? {}
}
