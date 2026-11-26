import { afterEach, expect, it, vi } from 'vitest'
import { gameFixture } from './fixtures'
import { asLiveBlock, gamePollInterval, splitShares } from './gameDetails'
import { gamePath } from './gameRoutes'

afterEach(() => vi.restoreAllMocks())

it('splits the bar in proportion to each side\'s points', () => {
  expect(splitShares(30, 10)).toEqual({ mine: 75, theirs: 25 })
  expect(splitShares(12.5, 0)).toEqual({ mine: 100, theirs: 0 })
})

it('leaves the bar empty when neither side has points', () => {
  expect(splitShares(null, null)).toEqual({ mine: 0, theirs: 0 })
  expect(splitShares(0, 0)).toEqual({ mine: 0, theirs: 0 })
})

it('gives a negative total no width, rather than a negative one', () => {
  expect(splitShares(-2, 8)).toEqual({ mine: 0, theirs: 100 })
  expect(splitShares(-2, -1)).toEqual({ mine: 0, theirs: 0 })
})

it('reads the game header through the live block helpers', () => {
  expect(asLiveBlock(gameFixture('live').game)).toMatchObject({
    status: 'in_progress', away_abbr: 'TB', away_score: 14, home_abbr: 'ATL', home_score: 17,
    possession: 'ATL', yard_line: 'TB 12', red_zone: true,
  })
})

const AFTER_KICKOFF = Date.parse('2026-10-18T17:05:00Z')
const BEFORE_KICKOFF = Date.parse('2026-10-18T16:00:00Z')

it('polls every 30 seconds while the game is in progress', () => {
  expect(gamePollInterval(gameFixture('live'), AFTER_KICKOFF)).toBe(30_000)
})

it('does not poll a final game, or before there is data', () => {
  expect(gamePollInterval(gameFixture('final'), AFTER_KICKOFF)).toBe(false)
  expect(gamePollInterval(null, AFTER_KICKOFF)).toBe(false)
  expect(gamePollInterval(undefined, AFTER_KICKOFF)).toBe(false)
})

it('polls an unstarted game only once its kickoff time has passed', () => {
  expect(gamePollInterval(gameFixture('preGame'), BEFORE_KICKOFF)).toBe(false)
  expect(gamePollInterval(gameFixture('preGame'), AFTER_KICKOFF)).toBe(30_000)
})

it('pauses polling while the tab is hidden', () => {
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
  expect(gamePollInterval(gameFixture('live'), AFTER_KICKOFF)).toBe(false)
})

it('builds a game page path that keeps the selected week', () => {
  expect(gamePath('401')).toBe('/matchup/game/401')
  expect(gamePath('401', '?week=7')).toBe('/matchup/game/401?week=7')
})
