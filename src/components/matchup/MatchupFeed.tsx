import { useState } from 'react'
import type { FeedItem } from '../../api/types'
import { emptyFeedText, FEED_FILTERS, filterFeed, type FeedFilter } from './feedFilter'
import { FeedRow } from './FeedRow'
import { useFreshCursors } from './useFreshCursors'

interface Props {
  items: FeedItem[]
  onOpenPlayer: (playerId: string) => void
}

/** Plays and news for both sides' players, newest first, with filter pills. Rows that arrived
 * since the previous poll are highlighted briefly. */
export function MatchupFeed({ items, onOpenPlayer }: Props) {
  const [filter, setFilter] = useState<FeedFilter>('all')
  const fresh = useFreshCursors(items)
  const shown = filterFeed(items, filter)

  return (
    <section className="matchup-feed" aria-label="Live feed">
      <div className="feed-filters" role="group" aria-label="Filter the feed">
        {FEED_FILTERS.map(({ value, label }) => (
          <button key={value} type="button" className="feed-pill" aria-pressed={filter === value} onClick={() => setFilter(value)}>
            {label}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="feed-empty">{emptyFeedText(filter)}</p>
      ) : (
        <ul className="feed-list">
          {shown.map((item) => <FeedRow key={item.cursor} item={item} fresh={fresh.has(item.cursor)} onOpenPlayer={onOpenPlayer} />)}
        </ul>
      )}
      <div className="feed-legend" aria-hidden="true">
        <span><i className="feed-stripe-mine" />Your player</span>
        <span><i className="feed-stripe-theirs" />Opponent's player</span>
        <span><i className="feed-stripe-news" />News</span>
      </div>
    </section>
  )
}
