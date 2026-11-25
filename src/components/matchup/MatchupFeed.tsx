import { useState } from 'react'
import type { FeedItem } from '../../api/types'
import { formatNumber } from '../ui/formatNumber'
import { emptyFeedText, FEED_FILTERS, filterFeed, type FeedFilter } from './feedFilter'
import { feedClock, feedText, newCursors } from './feedFormat'

function stripeClass(item: FeedItem): string {
  if (item.type === 'news') return 'feed-stripe-news'
  return item.side === 'mine' ? 'feed-stripe-mine' : 'feed-stripe-theirs'
}

function Delta({ item }: { item: FeedItem }) {
  if (item.type === 'news') return <span className="feed-delta feed-delta-news">News</span>
  const delta = item.fantasy_delta
  const tone = delta == null ? '' : delta < 0 ? 'feed-delta-negative' : 'feed-delta-positive'
  return <span className={`feed-delta ${tone}`}>{formatNumber(delta, { signed: true })}</span>
}

function FeedRow({ item, fresh, onOpenPlayer }: { item: FeedItem; fresh: boolean; onOpenPlayer: (playerId: string) => void }) {
  return (
    <li className={fresh ? 'feed-row feed-row-new' : 'feed-row'} data-side={item.side} data-type={item.type}>
      <span className="feed-clock">{feedClock(item)}</span>
      <span className={`feed-stripe ${stripeClass(item)}`} aria-hidden="true" />
      <span className="feed-text">
        <button type="button" className="feed-player" onClick={() => onOpenPlayer(item.player_id)}>
          {item.player_name ?? 'Unknown player'}
        </button>{' '}
        <span>{feedText(item)}</span>
        {item.game_label && <span className="feed-game">{item.game_label}</span>}
      </span>
      <Delta item={item} />
    </li>
  )
}

interface Props {
  items: FeedItem[]
  onOpenPlayer: (playerId: string) => void
}

/** Plays and news for both sides' players, newest first, with filter pills. Rows that arrived
 * since the previous poll are highlighted briefly. */
export function MatchupFeed({ items, onOpenPlayer }: Props) {
  const [filter, setFilter] = useState<FeedFilter>('all')
  // Each poll that brings a new list replaces the highlighted set; the first list highlights nothing.
  const [seen, setSeen] = useState({ items, fresh: new Set<string>() })
  if (seen.items !== items) setSeen({ items, fresh: newCursors(seen.items, items) })
  const { fresh } = seen
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
