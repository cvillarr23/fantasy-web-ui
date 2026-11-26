import type { FeedItem } from '../../api/types'
import { formatNumber } from '../ui/formatNumber'
import { feedClock, feedText } from './feedFormat'

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

interface Props {
  item: FeedItem
  /** Highlights a row that arrived since the previous poll. */
  fresh: boolean
  onOpenPlayer: (playerId: string) => void
  /** Off where every row belongs to the same game. */
  showGame?: boolean
}

/** One play or news story; goes inside a `feed-list`. */
export function FeedRow({ item, fresh, onOpenPlayer, showGame = true }: Props) {
  return (
    <li className={fresh ? 'feed-row feed-row-new' : 'feed-row'} data-side={item.side} data-type={item.type}>
      <span className="feed-clock">{feedClock(item)}</span>
      <span className={`feed-stripe ${stripeClass(item)}`} aria-hidden="true" />
      <span className="feed-text">
        <button type="button" className="feed-player" onClick={() => onOpenPlayer(item.player_id)}>
          {item.player_name ?? 'Unknown player'}
        </button>{' '}
        <span>{feedText(item)}</span>
        {showGame && item.game_label && <span className="feed-game">{item.game_label}</span>}
      </span>
      <Delta item={item} />
    </li>
  )
}
