import { useState } from 'react'
import type { FeedItem } from '../../api/types'
import { newCursors } from './feedFormat'

/** The cursors that arrived with the latest list. Each new list replaces the set, and the first
 * one highlights nothing. `items` must keep its identity between polls that change nothing. */
export function useFreshCursors(items: FeedItem[]): Set<string> {
  const [seen, setSeen] = useState({ items, fresh: new Set<string>() })
  if (seen.items !== items) setSeen({ items, fresh: newCursors(seen.items, items) })
  return seen.fresh
}
