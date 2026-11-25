import { afterEach, expect, it } from 'vitest'
import { liveMatchupFixture } from '../components/matchup/liveFixtures'
import { matchupConfig } from '../components/matchup/fixtures'
import { queryClient } from './queryClient'
import { matchupFeedQuery, matchupQuery } from './weekReads'

afterEach(() => queryClient.clear())

function interval(options: { refetchInterval?: unknown }, data: unknown): number | false {
  const fn = options.refetchInterval as (query: { state: { data: unknown } }) => number | false
  return fn({ state: { data } })
}

it('polls the matchup every 30 seconds only while a game is in progress', () => {
  const options = matchupQuery(matchupConfig, 7)
  expect(interval(options, liveMatchupFixture('sunday'))).toBe(30_000)
  expect(interval(options, liveMatchupFixture('preGame'))).toBe(false)
  expect(interval(options, null)).toBe(false)
  expect(options.refetchIntervalInBackground).toBe(false)
})

it('polls the feed on the matchup\'s cadence, read from the matchup cache', () => {
  const feed = matchupFeedQuery(matchupConfig, 7)
  const matchupKey = matchupQuery(matchupConfig, 7).queryKey
  expect(interval(feed, undefined)).toBe(false)
  queryClient.setQueryData(matchupKey, liveMatchupFixture('sunday'))
  expect(interval(feed, undefined)).toBe(30_000)
  queryClient.setQueryData(matchupKey, liveMatchupFixture('final'))
  expect(interval(feed, undefined)).toBe(false)
})
