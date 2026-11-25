import type { FeedItem } from '../../api/types'

export type FeedFilter = 'all' | 'mine' | 'theirs' | 'touchdowns' | 'news'

export const FEED_FILTERS: { value: FeedFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'mine', label: 'My players' },
  { value: 'theirs', label: 'Opponent' },
  { value: 'touchdowns', label: 'Touchdowns' },
  { value: 'news', label: 'News' },
]

function matches(item: FeedItem, filter: FeedFilter): boolean {
  if (filter === 'mine' || filter === 'theirs') return item.side === filter
  if (filter === 'touchdowns') return item.type === 'play' && item.scoring === true
  if (filter === 'news') return item.type === 'news'
  return true
}

export function filterFeed(items: FeedItem[], filter: FeedFilter): FeedItem[] {
  return items.filter((item) => matches(item, filter))
}

/** The empty-list text for a filter. */
export function emptyFeedText(filter: FeedFilter): string {
  return filter === 'all' ? 'No plays or news yet.' : 'Nothing matches this filter yet.'
}
