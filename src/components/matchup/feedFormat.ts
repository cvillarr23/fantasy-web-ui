import type { FeedItem } from '../../api/types'

/** Cursors in `next` that were not in `previous`. Empty on the first load, so opening the page
 * does not flash every row. */
export function newCursors(previous: FeedItem[] | undefined, next: FeedItem[]): Set<string> {
  if (!previous) return new Set()
  const seen = new Set(previous.map((item) => item.cursor))
  return new Set(next.filter((item) => !seen.has(item.cursor)).map((item) => item.cursor))
}

/** The row's clock: "Q3 8:42" for a play, the time of day for news. */
export function feedClock(item: FeedItem): string {
  if (item.type === 'play') {
    const quarter = item.period ? `Q${item.period}` : ''
    return [quarter, item.clock].filter(Boolean).join(' ') || '—'
  }
  return item.at ? new Date(item.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—'
}

/** The play text or news headline. */
export function feedText(item: FeedItem): string {
  return (item.type === 'play' ? item.text : item.headline) ?? ''
}
