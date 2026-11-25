import { expect, it } from 'vitest'
import { emptyFeedText, filterFeed } from './feedFilter'
import { newCursors } from './feedFormat'
import { liveFeedFixture } from './liveFixtures'

const items = liveFeedFixture('sunday').items

it('keeps everything under All', () => {
  expect(filterFeed(items, 'all')).toHaveLength(items.length)
})

it('filters by side', () => {
  expect(filterFeed(items, 'mine').every((item) => item.side === 'mine')).toBe(true)
  expect(filterFeed(items, 'theirs').every((item) => item.side === 'theirs')).toBe(true)
  expect(filterFeed(items, 'mine').length + filterFeed(items, 'theirs').length).toBe(items.length)
})

it('keeps only scoring plays under Touchdowns, from either side', () => {
  const touchdowns = filterFeed(items, 'touchdowns')
  expect(touchdowns).toHaveLength(2)
  expect(touchdowns.every((item) => item.type === 'play' && item.scoring)).toBe(true)
  expect(new Set(touchdowns.map((item) => item.side))).toEqual(new Set(['mine', 'theirs']))
})

it('keeps only news under News', () => {
  expect(filterFeed(items, 'news').map((item) => item.type)).toEqual(['news'])
})

it('words the empty state by filter', () => {
  expect(emptyFeedText('all')).toBe('No plays or news yet.')
  expect(emptyFeedText('news')).toBe('Nothing matches this filter yet.')
})

it('finds the items that arrived since the last poll, and none on the first', () => {
  expect(newCursors(undefined, items).size).toBe(0)
  expect([...newCursors(items.slice(2), items)]).toEqual([items[0].cursor, items[1].cursor])
})
