import { afterEach, expect, it, vi } from 'vitest'
import { liveMatchupFixture } from './liveFixtures'
import { anyGameInProgress, latestUpdate, matchupGames, pollInterval, sideCounts, updatedAgo } from './matchupLive'

afterEach(() => vi.restoreAllMocks())

it('counts starters playing, yet to play and on a bye', () => {
  const matchup = liveMatchupFixture('sunday')
  expect(sideCounts(matchup.our_team)).toEqual({ playing: 2, yetToPlay: 1, onBye: 1 })
  expect(sideCounts(matchup.opponent)).toEqual({ playing: 2, yetToPlay: 2, onBye: 0 })
})

it('counts nobody as playing or yet to play in a finished week, only the bye', () => {
  expect(sideCounts(liveMatchupFixture('final').our_team)).toEqual({ playing: 0, yetToPlay: 0, onBye: 1 })
})

it('makes one tile per game with each side\'s starter points', () => {
  const games = matchupGames(liveMatchupFixture('sunday'))
  expect(games.map((game) => game.label)).toEqual(['TB 14 – 17 ATL', 'MIA 20 – 31 BUF', 'GB @ DET'])
  const live = games[0]
  expect(live.statusText).toBe('Q3 8:42')
  expect(live.myPoints).toBeCloseTo(24.6 + 11.2)
  expect(live.theirPoints).toBeCloseTo(7.1 + 2.4)
  expect(live.myPlayers).toEqual(['Quarterback', 'A'])
  expect(games[1].statusText).toBe('Final')
  expect(games[2]).toMatchObject({ statusText: 'Upcoming', myPoints: null, theirPoints: null })
})

it('has no tiles when no starter has a snapshot', () => {
  const matchup = liveMatchupFixture('sunday')
  for (const line of [...matchup.our_team.starters, ...matchup.opponent.starters]) line.live = null
  expect(matchupGames(matchup)).toEqual([])
})

it('polls every 30 seconds while a game is in progress', () => {
  expect(anyGameInProgress(liveMatchupFixture('sunday'))).toBe(true)
  expect(pollInterval(liveMatchupFixture('sunday'))).toBe(30_000)
})

it('does not poll before kickoff, after the last game, or without a matchup', () => {
  expect(pollInterval(liveMatchupFixture('preGame'))).toBe(false)
  expect(pollInterval(liveMatchupFixture('final'))).toBe(false)
  expect(pollInterval(null)).toBe(false)
  expect(pollInterval(undefined)).toBe(false)
})

it('pauses polling while the tab is hidden', () => {
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
  expect(pollInterval(liveMatchupFixture('sunday'))).toBe(false)
})

it('reports the newest snapshot time and its age', () => {
  const matchup = liveMatchupFixture('sunday', '2026-10-18T17:00:00Z')
  const at = latestUpdate(matchup)!
  expect(at).toBe(Date.parse('2026-10-18T17:00:00Z'))
  expect(updatedAgo(at, at + 12_000)).toBe('Updated 12s ago')
  expect(updatedAgo(at, at + 150_000)).toBe('Updated 2m ago')
})
