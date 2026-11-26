import { afterEach, expect, it, vi } from 'vitest'
import { getRecentNews } from './client'
import { recentNewsQuery } from './newsReads'

afterEach(() => vi.unstubAllGlobals())

it('shares one cache entry per set of players, fresh for five minutes and never polled', () => {
  const query = recentNewsQuery(['b', 'a', 'b'])
  expect(query.queryKey).toEqual(['news-recent', ['a', 'b']])
  expect(query.staleTime).toBe(5 * 60_000)
  expect(query.refetchInterval).toBeUndefined()
  expect(recentNewsQuery([]).enabled).toBe(false)
})

it('reads the recent-news flags for the players in one request', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ has_news_24h: { a: true } })))
  vi.stubGlobal('fetch', fetch)
  await expect(getRecentNews(['a', 'b'])).resolves.toEqual({ has_news_24h: { a: true } })
  expect(String(fetch.mock.calls[0][0])).toContain('/v1/news/recent?player_ids=a%2Cb')
})
